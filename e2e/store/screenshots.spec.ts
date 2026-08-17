/**
 * Prints da ficha da App Store.
 *
 * Substituem as artes geradas por IA: o mesmo enquadramento, mas com o app de
 * verdade. Rodam sob o mesmo harness dos testes (bundle web + backend falso),
 * com relógio fixo para o dia sair sempre igual — print de loja não pode mudar
 * de conteúdo a cada execução.
 *
 * Uso: `npm run store:shots`. As imagens saem em `e2e/.store/`.
 */

import { expect, test } from '../support/fixtures';

/** 1320 × 2868 é a exigência do iPhone de 6,9". A escala 3× faz a conta. */
const SHOTS_DIR = 'e2e/.store';

/**
 * Meio da manhã de hoje.
 *
 * A hora é fixa para o print não depender de quando a execução acontece; o dia
 * não é, porque as atividades do cenário são criadas para o dia corrente — com
 * uma data fixa a lista sairia vazia.
 */
function morningToday(): Date {
  const now = new Date();
  now.setHours(9, 30, 0, 0);
  return now;
}

test.skip(!process.env.E2E_STORE_SHOTS, 'Prints de loja só rodam sob demanda (E2E_STORE_SHOTS=1)');

test.use({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 });

test('01 — Home', async ({ app }) => {
  await app.launch({ now: morningToday() });

  await expect(app.page.getByText('Ordenado pela sua energia')).toBeVisible();
  await app.page.screenshot({ path: `${SHOTS_DIR}/01-home.png` });
});

test('02 — Energia do dia', async ({ app }) => {
  await app.launch({ now: morningToday() });

  const card = app.page.getByText('Pico de energia de hoje');
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await app.page.screenshot({ path: `${SHOTS_DIR}/02-energia.png` });
});

test('03 — Lista do dia', async ({ app }) => {
  await app.launch({ now: morningToday() });

  const heading = app.page.getByText('Ordenado pela sua energia');
  await expect(heading).toBeVisible();
  // A rolagem é do ScrollView, não da página: `scrollIntoViewIfNeeded` não move
  // nada porque o item já está no DOM. A roda do mouse é o que empurra a lista
  // para o topo do enquadramento.
  await app.page.mouse.move(220, 600);
  await app.page.mouse.wheel(0, 760);
  await expect(heading).toBeVisible();
  await app.page.screenshot({ path: `${SHOTS_DIR}/03-lista.png` });
});

test('04 — Calendário', async ({ app }) => {
  await app.launch({ now: morningToday() });
  await app.tab('calendar');

  // A grade do calendar-kit monta depois do primeiro frame: sem esperar por uma
  // hora desenhada, o print sai no spinner.
  await expect(app.page.getByText('09:00', { exact: true }).first()).toBeVisible();
  await app.page.screenshot({ path: `${SHOTS_DIR}/04-calendario.png` });
});

test('05 — Metas', async ({ app }) => {
  await app.launch({ now: morningToday() });
  await app.tab('goals');

  await expect(app.page.getByText('Meta principal')).toBeVisible();
  await app.page.screenshot({ path: `${SHOTS_DIR}/05-metas.png` });
});

test('06 — Como foi seu sono', async ({ app }) => {
  await app.launch({ route: '/onboarding', state: { onboardingCompleted: false, onboardingStep: 5 }, waitForTabs: false, now: morningToday() });

  await app.page.getByRole('button', { name: /^Não uso/ }).click();
  await expect(app.page.getByText('Sua curva de energia')).toBeVisible();
  await app.page.screenshot({ path: `${SHOTS_DIR}/06-sono.png` });
});
