/**
 * Motor da varredura: descoberta de controles, assinatura de estado e auditoria.
 *
 * O app é uma SPA com 4 rotas e troca de tela por estado, então não existe URL
 * para enumerar. A varredura trata o conjunto de controles visíveis como a
 * identidade de um "estado" e caminha por eles em largura, sempre a partir de um
 * app recém-aberto (replay do caminho) — assim um estado sujo não contamina o
 * próximo.
 */

import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';

export type Control = {
  /** Nome acessível, que é também o seletor usado no replay. */
  name: string;
  role: string;
};

export type StateSnapshot = {
  /** Identidade do estado: os controles que ele oferece. */
  signature: string;
  /**
   * Marca de pintura, usada só para saber se a tela parou de se mexer.
   *
   * A lista de controles não serve para isso: numa transição em cross-fade as
   * duas telas coexistem no DOM, então os nomes ficam estáveis enquanto a
   * opacidade e a posição ainda mudam.
   */
  stamp: string;
  controls: Control[];
  /** Títulos visíveis, usados para nomear o estado no relatório. */
  headings: string[];
};

/**
 * Controles que a varredura não toca.
 *
 * Três motivos: sair do app (encerra a sessão e invalida o resto do caminho),
 * ação destrutiva já coberta por spec dedicado, e compra/abertura de link
 * externo, que sai do escopo do bundle.
 */
const BLOCKED = [
  /^Sair$/,
  /^Deletar/,
  /^Excluir/,
  /Deletar Conta/,
  /Remover métrica/,
  /Remover diagnóstico/,
  /Remover do dia/,
  /^Assinar/,
  /Quero o desconto/,
  /Garantir oferta/,
  /Restaurar compra/,
  /Política de Privacidade/,
  /Termos de Uso/,
  /Abrir ajustes/,
  /Sincronizar com Google Calendar/,
];

const ROLE_SELECTOR = '[role="button"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="link"]';

/**
 * Teto por clique, em ms.
 *
 * O `click` do Playwright espera sem limite por padrão. Um controle visível mas
 * não acionável (coberto por overlay, por exemplo) travaria a varredura inteira
 * até o timeout do teste; com o teto, o caminho é descartado e a fila anda. O
 * valor é curto porque o bundle é servido local e estático: se o alvo não ficou
 * acionável neste tempo, ele não vai ficar.
 */
const CLICK_TIMEOUT = 1_500;

/** Duração do toque: gestos do RN Web ignoram clique instantâneo (ver `app.tap`). */
const CLICK_DELAY = 120;

/** Quadros iguais seguidos para considerar a tela pronta. */
const STABLE_FRAMES = 2;

/** Teto de espera por uma tela nova, em ms. */
const SETTLE_TIMEOUT = 800;

/** Normaliza o nome acessível: o RN Web concatena o texto dos filhos. */
function cleanName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 80);
}

/**
 * Espera o app pintar o primeiro controle.
 *
 * `page.goto` volta no evento `load`, que acontece antes do React montar. Nas
 * rotas sem barra de tabs (login, cadastro, onboarding) não há nada mais para
 * esperar, e sem isto o primeiro clique disputa com o boot: às vezes ganha, às
 * vezes esgota o teto do clique e o caminho é descartado por engano.
 */
export async function waitForBoot(page: Page): Promise<void> {
  await page.locator(ROLE_SELECTOR).first().waitFor({ state: 'visible' });
}

/** Controle com o que basta para saber se ele ainda está se mexendo. */
type ProbedControl = Control & { top: number; opacity: number };

/** Lê os controles acionáveis da página, já sem os bloqueados e sem repetidos. */
async function probe(page: Page): Promise<ProbedControl[]> {
  const found = await page.evaluate((selector: string) => {
    /** Opacidade herdada: quem anima é o pai, não o controle. */
    const effectiveOpacity = (element: Element): number => {
      let value = 1;
      let node: Element | null = element;
      while (node) {
        value *= Number(window.getComputedStyle(node).opacity || '1');
        node = node.parentElement;
      }
      return value;
    };

    const isVisible = (element: Element): boolean => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      // `checkVisibility` também olha os ancestrais. É o que importa aqui: as
      // ações de arrastar do card de tarefa ficam num pai com `opacity: 0`, e uma
      // checagem só do próprio nó as ofereceria como clicáveis — cada uma
      // custaria o teto de um clique para descobrir que não são.
      return element.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true });
    };

    return Array.from(document.querySelectorAll(selector))
      .filter((element) => isVisible(element) && !element.hasAttribute('disabled') && element.getAttribute('aria-disabled') !== 'true')
      .map((element) => ({
        name: element.getAttribute('aria-label') ?? element.textContent ?? '',
        role: element.getAttribute('role') ?? 'button',
        top: Math.round(element.getBoundingClientRect().top),
        opacity: Math.round(effectiveOpacity(element) * 100),
      }));
  }, ROLE_SELECTOR);

  const seen = new Set<string>();
  const controls: ProbedControl[] = [];

  for (const item of found) {
    const name = cleanName(item.name);
    if (!name || seen.has(name)) continue;
    if (BLOCKED.some((pattern) => pattern.test(name))) continue;
    seen.add(name);
    controls.push({ ...item, name });
  }

  return controls;
}

/** Fotografia do estado: o conjunto de controles é a identidade da tela. */
export async function snapshot(page: Page): Promise<StateSnapshot> {
  const probed = await probe(page);
  const headings = await page.evaluate(() =>
    Array.from(document.querySelectorAll('div[dir="auto"]'))
      .slice(0, 8)
      .map((element) => (element.textContent ?? '').trim())
      .filter(Boolean),
  );

  return {
    signature: probed.map((control) => `${control.role}:${control.name}`).join('|'),
    stamp: probed.map((control) => `${control.name}@${control.top}@${control.opacity}`).join('|'),
    controls: probed.map(({ name, role }) => ({ name, role })),
    headings,
  };
}

/** Espera o próximo par de quadros: o efeito do clique e a renderização dele. */
async function nextFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );
}

/**
 * Espera a tela terminar de trocar e devolve a fotografia final.
 *
 * `before` é a assinatura de antes do clique. Sem ela, a espera acabaria no
 * primeiro par de quadros iguais — que é justamente a tela *antiga*, ainda
 * intacta porque o React nem começou a montar a nova. Com ela, a varredura só
 * aceita um estado que já mudou; se nada mudar até o teto, o clique realmente
 * não levou a lugar nenhum.
 */
export async function settle(page: Page, before?: string): Promise<StateSnapshot> {
  const deadline = Date.now() + SETTLE_TIMEOUT;
  let current = await snapshot(page);
  let last = current.stamp;
  let stable = 0;

  while (Date.now() < deadline) {
    await nextFrames(page);
    current = await snapshot(page);

    if (current.stamp !== last) {
      last = current.stamp;
      stable = 0;
      continue;
    }

    stable += 1;
    if (stable >= STABLE_FRAMES && current.signature !== before) return current;
  }

  return current;
}

/** Papel ARIA aceito pelo `getByRole`; os papéis lidos da página são um subconjunto. */
type Role = Parameters<Page['getByRole']>[0];

/** Seletores do controle, em ordem: papel + nome acessível, depois só o rótulo. */
function candidates(page: Page, control: Control): Locator[] {
  return [page.getByRole(control.role as Role, { name: control.name, exact: true }).first(), page.getByLabel(control.name, { exact: true }).first()];
}

/**
 * Aciona um controle pelo nome. `false` quando ele não existe mais ou não é
 * acionável — o caminho deixou de valer e a varredura segue, sem reprovar.
 */
export async function clickControl(page: Page, control: Control): Promise<boolean> {
  for (const target of candidates(page, control)) {
    if ((await target.count()) === 0) continue;
    return target.click({ delay: CLICK_DELAY, timeout: CLICK_TIMEOUT }).then(
      () => true,
      () => false,
    );
  }

  return false;
}

export type AxeViolation = { id: string; impact: string; nodes: number; help: string };

/**
 * Auditoria de acessibilidade do estado atual.
 *
 * Roda só as regras que fazem sentido num app RN Web: contraste e semântica de
 * landmark são decididos pelo design system e gerariam ruído em toda tela.
 */
export async function auditAccessibility(page: Page): Promise<AxeViolation[]> {
  const results = await new AxeBuilder({ page }).withRules(['button-name', 'link-name', 'image-alt', 'input-image-alt', 'aria-valid-attr', 'aria-valid-attr-value', 'aria-required-attr', 'duplicate-id-aria', 'label']).analyze();

  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact ?? 'unknown',
    nodes: violation.nodes.length,
    help: violation.help,
  }));
}

/** Sinais de que a tela caiu num error boundary em vez de renderizar. */
const CRASH_TEXTS = [/algo deu errado/i, /unhandled error/i, /application error/i, /render error/i, /something went wrong/i];

export async function findCrashText(page: Page): Promise<string | null> {
  const text = await page.evaluate(() => document.body.innerText ?? '');
  return CRASH_TEXTS.find((pattern) => pattern.test(text))?.source ?? null;
}
