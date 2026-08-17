/**
 * Gates premium: o que acontece quando o trial acaba.
 *
 * Com a assinatura fora de validade o app abre no funil de paywall (oferta →
 * desconto → última chance) e, ao ser recusado, bloqueia calendário, estatísticas
 * e metas. É o caminho que decide receita, então cada saída dele é verificada.
 */

import type { Page } from '@playwright/test';

import { expect, test } from '../support/fixtures';

const LOCKED_TABS = ['Calendário (bloqueado)', 'Gráficos de andamento (bloqueado)', 'Metas (bloqueado)'];

/** Recusa os três passos do funil e devolve o app na Home bloqueada. */
async function refuseFunnel(app: { page: Page }) {
  await app.page.getByRole('button', { name: 'Agora não' }).click();
  await app.page.getByRole('button', { name: 'Não, obrigado' }).click();
  await app.page.getByRole('button', { name: 'Recusar oferta' }).click();
}

test('trial expirado abre o funil de paywall', async ({ app }) => {
  await app.launch({ scenario: 'expiredTrial', waitForTabs: false });

  await expect(app.page.getByText('Desbloqueie o Flowly Premium')).toBeVisible();
  await expect(app.page.getByRole('button', { name: 'Assinar agora' })).toBeVisible();
  await expect(app.page.getByText(/Flowly Premium Anual · 12 meses/)).toBeVisible();
  await expect(app.page.getByRole('link', { name: 'Termos de Uso (EULA)' })).toBeVisible();
  await expect(app.page.getByRole('link', { name: 'Política de Privacidade' })).toBeVisible();

  await app.page.getByRole('button', { name: 'Agora não' }).click();
  await expect(app.page.getByText('Só hoje no plano anual')).toBeVisible();
  await expect(app.page.getByText(/Flowly Premium Anual · 12 meses/)).toBeVisible();
  await expect(app.page.getByRole('link', { name: 'Termos de Uso (EULA)' })).toBeVisible();

  await app.page.getByRole('button', { name: 'Não, obrigado' }).click();
  await expect(app.page.getByText('Nossa melhor oferta')).toBeVisible();
});

test('funil recusado bloqueia calendário, estatísticas e metas', async ({ app }) => {
  await app.launch({ scenario: 'expiredTrial', waitForTabs: false });
  await refuseFunnel(app);

  await expect(app.page.getByText('Calendário, metas e gráficos estão bloqueados')).toBeVisible();
  for (const label of LOCKED_TABS) {
    await expect(app.page.getByRole('button', { name: label })).toBeVisible();
  }

  // A Home continua utilizável: bloquear o extra não pode bloquear o básico.
  await expect(app.page.getByText('Escrever proposta comercial')).toBeVisible();
});

test('tocar numa tab bloqueada traz o paywall de volta', async ({ app }) => {
  await app.launch({ scenario: 'expiredTrial', waitForTabs: false });
  await refuseFunnel(app);

  await app.page.getByRole('button', { name: 'Metas (bloqueado)' }).click();

  // O funil retoma no passo onde parou (última chance), não do começo.
  await expect(app.page.getByText('Nossa melhor oferta')).toBeVisible();
  await expect(app.page.getByText('Faturar 30 mil por mês', { exact: true })).toBeHidden();
});

test('o banner de desbloqueio abre o paywall', async ({ app }) => {
  await app.launch({ scenario: 'expiredTrial', waitForTabs: false });
  await refuseFunnel(app);

  await app.page.getByRole('button', { name: 'Desbloquear recursos Premium' }).click();

  await expect(app.page.getByText('Desbloqueie o Flowly Premium')).toBeVisible();
});

test('assinatura ativa libera as tabs sem paywall', async ({ app }) => {
  await app.launch({ scenario: 'premium' });

  for (const label of LOCKED_TABS) {
    await expect(app.page.getByRole('button', { name: label })).toBeHidden();
  }
  await expect(app.page.getByText('Desbloqueie o Flowly Premium')).toBeHidden();

  await app.tab('goals');
  await expect(app.page.getByText('Faturar 30 mil por mês', { exact: true })).toBeVisible();
});

test('trial ativo não mostra paywall nem bloqueio', async ({ app }) => {
  await app.launch();

  await expect(app.page.getByText('Desbloqueie o Flowly Premium')).toBeHidden();
  await app.tab('calendar');
  await expect(app.page.getByText('Calendário')).toBeVisible();
});

test('assinatura em 500 não bloqueia o app', async ({ app }) => {
  await app.launch({
    waitForTabs: false,
    world: (world) => {
      world.failures = [{ pattern: /^\/subscription$/, status: 500, body: { error: 'Internal Server Error' } }];
    },
  });
  app.allowFailures();

  // Falha de leitura da assinatura não pode virar cobrança nem tela travada.
  await expect(app.page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
  await expect(app.page.getByText('Desbloqueie o Flowly Premium')).toBeHidden();
});
