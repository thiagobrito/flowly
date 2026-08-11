/**
 * Contrato do harness.
 *
 * Se este spec falhar, nenhum outro é confiável: ele verifica que o app renderiza
 * sob RN Web, que o estado injetado dispensa o login e que a interceptação da API
 * está de fato respondendo.
 */

import { expect, test } from '../support/fixtures';

test('abre autenticado na Home, com as tabs e o conteúdo do dia', async ({ app }) => {
  await app.launch();

  await expect(app.page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
  await expect(app.page.getByText('Escrever proposta comercial')).toBeVisible();

  const home = app.api.calls.filter((call) => call.path === '/home');
  expect(home.length, 'a Home deve buscar /home').toBeGreaterThan(0);
  expect(home.every((call) => call.status === 200)).toBe(true);
});

test('nenhuma chamada cai fora das fixtures do backend falso', async ({ app }) => {
  await app.launch();
  await app.page.getByText('Escrever proposta comercial').waitFor();

  const unhandled = [...new Set(app.api.calls.filter((call) => call.unhandled).map((call) => `${call.method} ${call.path}`))];
  expect(unhandled.sort()).toEqual([]);
});

test('sem sessão o app manda para o login', async ({ app }) => {
  await app.launch({ state: { token: null }, waitForTabs: false });

  await expect(app.page.getByPlaceholder('E-mail')).toBeVisible();
});
