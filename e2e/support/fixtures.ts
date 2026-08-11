/**
 * Fixture única de todos os specs do app.
 *
 * `app.launch()` faz o caminho inteiro: intercepta a API com o mundo do cenário,
 * injeta o estado local (para não repetir login), abre a rota e espera o app
 * ficar pronto. Na desmontagem, cobra as invariantes globais — assim nenhum spec
 * precisa lembrar de verificar erro de console.
 */

import type { Locator, Page } from '@playwright/test';
import { expect, test as base } from '@playwright/test';

import type { ApiRecorder } from './api';
import { installApi, KNOWN_MISSING_ENDPOINTS } from './api';
import type { FakeWorld } from './backend';
import { type ConsoleWatcher, forwardUnhandledRejections, watchConsole } from './invariants';
import { scenario, type ScenarioName } from './scenarios';
import { installFakeSpeech } from './speech';
import { buildLocalState, type LocalStateOptions } from './state';

export const TAB = {
  new: 'Nova atividade',
  home: 'Home',
  calendar: 'Calendário',
  progress: 'Gráficos de andamento',
  goals: 'Metas',
} as const;

export type LaunchOptions = {
  scenario?: ScenarioName;
  /** Estado do `localStorage`; por padrão sessão válida e onboarding concluído. */
  state?: LocalStateOptions;
  /** Rota do expo-router. */
  route?: '/' | '/login' | '/create-account' | '/onboarding';
  /** Ajuste fino do cenário, antes da primeira requisição. */
  world?: (world: FakeWorld) => void;
  /** Instante fixo, para as regras de energia/circadiano. */
  now?: Date | string;
  /** Espera a barra de tabs aparecer (desligue em telas sem ela). */
  waitForTabs?: boolean;
  /** Instala o reconhecedor de fala falso, habilitando `app.speak()`. */
  speech?: boolean;
};

export type App = {
  page: Page;
  /** Estado do backend falso — mutável durante o teste. */
  world: FakeWorld;
  api: ApiRecorder;
  console: ConsoleWatcher;
  launch(options?: LaunchOptions): Promise<App>;
  /** Libera as invariantes quando o próprio teste provoca o erro. */
  allowFailures(): void;
  tab(key: keyof typeof TAB): Promise<void>;
  tap(target: Locator): Promise<void>;
  swipe(target: Locator, direction: 'left' | 'right'): Promise<void>;
  /** Dita um texto no assistente de voz (exige `launch({ speech: true })`). */
  speak(text: string): Promise<void>;
  /** Diálogo do `Alert` (ver `e2e/support/alertShim.js`). */
  dialog(): Locator;
  /** Responde ao `Alert` clicando o botão do rótulo informado. */
  confirm(label: string): Promise<void>;
};

/**
 * Pausa entre pressionar e soltar, em ms.
 *
 * Controles dentro de um `GestureDetector` (os cards de tarefa) não reagem a um
 * clique instantâneo no RN Web: o reconhecedor de pan fica com o ponteiro e o
 * `Pressable` interno nunca recebe o toque. Com uma pausa curta, o gesto
 * desiste e o toque chega. Não é `waitForTimeout` disfarçado — é a duração do
 * próprio gesto, como um toque real.
 */
const TAP_DELAY_MS = 120;

/** Deslocamento do swipe: acima do `OPEN_THRESHOLD` (40px) do card de tarefa. */
const SWIPE_DISTANCE = 120;

/**
 * Cenários cuja razão de existir é a falha: cobrar as invariantes neles seria
 * reprovar o teste pelo que ele está verificando.
 */
const NOISY_SCENARIOS: ScenarioName[] = ['serverError', 'unauthorized'];

/** Erro de console e requisição falha reprovam por padrão. */
export const test = base.extend<{ app: App }>({
  app: async ({ page }, provide) => {
    let strict = true;
    // A varredura relança o app dezenas de vezes na mesma página; os scripts de
    // inicialização se acumulam, então os que não dependem de opção entram uma vez.
    let booted = false;
    const watcher = watchConsole(page);

    const app: App = {
      page,
      world: scenario('fullDay'),
      api: null as unknown as ApiRecorder,
      console: watcher,

      async launch(options: LaunchOptions = {}) {
        const { route = '/', waitForTabs = route === '/' } = options;
        const name = options.scenario ?? 'fullDay';
        if (NOISY_SCENARIOS.includes(name)) strict = false;

        app.world = scenario(name);
        options.world?.(app.world);
        app.api = await installApi(page, app.world);

        if (!booted) {
          await page.addInitScript(forwardUnhandledRejections);
          booted = true;
        }

        if (options.now) await page.clock.setFixedTime(new Date(options.now));
        if (options.speech) await page.addInitScript(installFakeSpeech);

        const localState = buildLocalState(options.state);
        await page.addInitScript((entries: Record<string, string>) => {
          // Limpar antes de escrever: o `AsyncStorage` no web é o `localStorage`,
          // que sobrevive ao `goto`. Sem isto, o que o app gravou numa abertura
          // (passo do onboarding, preferências, modo de energia) vazaria para a
          // próxima — e a varredura, que relança dezenas de vezes, andaria sobre
          // estado sujo.
          window.localStorage.clear();
          for (const [key, value] of Object.entries(entries)) window.localStorage.setItem(key, value);
        }, localState);

        await page.goto(route === '/' ? '/' : route);

        if (waitForTabs) {
          await expect(page.getByRole('button', { name: TAB.home, exact: true })).toBeVisible();
        }

        return app;
      },

      allowFailures() {
        strict = false;
      },

      async tab(key) {
        await page.getByRole('button', { name: TAB[key], exact: true }).click();
      },

      async tap(target) {
        await target.click({ delay: TAP_DELAY_MS });
      },

      async speak(text) {
        // A escuta começa 600ms depois de cada passo abrir; sem sessão ativa
        // o shim lança, então esperamos ela existir em vez de dormir.
        await page.waitForFunction(() => '__e2eListening' in window);
        await page.evaluate((spoken: string) => (window as unknown as { __e2eSpeak(value: string): void }).__e2eSpeak(spoken), text);
      },

      dialog() {
        return page.getByRole('dialog');
      },

      async confirm(label) {
        await app.dialog().getByRole('button', { name: label, exact: true }).click();
      },

      async swipe(target, direction) {
        const box = await target.boundingBox();
        if (!box) throw new Error('Elemento sem caixa para arrastar');

        const centerY = box.y + box.height / 2;
        const startX = box.x + box.width / 2;
        const distance = direction === 'right' ? SWIPE_DISTANCE : -SWIPE_DISTANCE;

        await page.mouse.move(startX, centerY);
        await page.mouse.down();
        // Passos intermediários: o reconhecedor de pan só ativa depois de
        // acumular deslocamento, e um salto único não o acorda.
        for (let step = 1; step <= 6; step += 1) {
          await page.mouse.move(startX + (distance * step) / 6, centerY);
        }
        await page.mouse.up();
      },
    };

    await provide(app);

    if (!app.api || !strict) return;

    expect(watcher.relevant(), 'erros de console durante o teste').toEqual([]);
    expect(
      app.api.failed(KNOWN_MISSING_ENDPOINTS).map((call) => `${call.method} ${call.path} → ${call.status}`),
      'requisições com falha inesperada',
    ).toEqual([]);
  },
});

export { KNOWN_MISSING_ENDPOINTS } from './api';
export { task } from './backend';
export { dayKeyOffset, todayKey } from './state';
export { expect } from '@playwright/test';
