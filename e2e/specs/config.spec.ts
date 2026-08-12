/**
 * Configurações: tema, lembretes, logout e exclusão de conta.
 *
 * As três últimas passam por `Alert`, que no RN Web é um no-op. O bundle de E2E
 * troca esse módulo pelo shim de `e2e/support/alertShim.js`, então o diálogo
 * existe no DOM e `app.confirm()` responde por ele.
 */

import type { Page } from '@playwright/test';

import { expect, test } from '../support/fixtures';

/** Lê uma chave do `localStorage`, que é onde o `AsyncStorage` do web guarda. */
function stored(app: { page: Page }, key: string) {
  return app.page.evaluate((name: string) => window.localStorage.getItem(name), key);
}

test('abre as configurações e volta para a Home', async ({ app }) => {
  await app.launch();
  await app.page.getByRole('button', { name: 'Configurações' }).click();

  await expect(app.page.getByText('Configurações', { exact: true })).toBeVisible();
  await expect(app.page.getByText('APARÊNCIA')).toBeVisible();
  await expect(app.page.getByText('NOTIFICAÇÕES')).toBeVisible();
  await expect(app.page.getByText('INTEGRAÇÕES')).toBeVisible();

  await app.page.getByRole('button', { name: 'Voltar' }).click();
  await expect(app.page.getByText('Sua energia corporal')).toBeVisible();
});

test('escolher o tema escuro persiste a preferência', async ({ app }) => {
  await app.launch();
  await app.page.getByRole('button', { name: 'Configurações' }).click();

  await app.page.getByRole('button', { name: 'Escuro' }).click();

  await expect.poll(() => stored(app, 'theme_mode_v1')).toBe('dark');
  // O NativeWind aplica o modo escuro pela classe no `<html>`: é o efeito
  // visível de ter salvado a preferência, não só o valor no storage.
  await expect.poll(() => app.page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
});

test('desligar os lembretes de tarefas persiste a preferência', async ({ app }) => {
  await app.launch();
  await app.page.getByRole('button', { name: 'Configurações' }).click();

  await expect(app.page.getByText('Ativados: avisos 10 min antes e no horário')).toBeVisible();
  await app.page.getByRole('button', { name: /Lembretes de tarefas/ }).click();
  await app.page.getByRole('switch', { name: 'Lembretes de tarefas' }).click();

  await expect.poll(async () => JSON.parse((await stored(app, 'config_preferences_v1')) ?? '{}').taskRemindersEnabled).toBe(false);
});

test('deletar a conta chama o servidor e derruba a sessão', async ({ app }) => {
  await app.launch();
  await app.page.getByRole('button', { name: 'Configurações' }).click();

  await app.page.getByRole('button', { name: 'Deletar Conta' }).click();
  await expect(app.page.getByText('Tem certeza? Esta ação é irreversível e todos os seus dados serão removidos.')).toBeVisible();
  await app.confirm('Deletar');

  await expect.poll(() => app.api.calls.some((call) => call.method === 'DELETE' && call.path === '/auth/delete')).toBe(true);
  await expect(app.page.getByText('Bem-vindo de volta')).toBeVisible();
  // `signOut` sobrescreve o registro com token nulo, em vez de apagar a chave.
  // A escrita é assíncrona (fila do `InteractionManager`), por isso esperamos.
  await expect.poll(async () => JSON.parse((await stored(app, 'auth_session_v1')) ?? '{}').token).toBeNull();
});

test('cancelar a exclusão da conta não chama o servidor', async ({ app }) => {
  await app.launch();
  await app.page.getByRole('button', { name: 'Configurações' }).click();

  await app.page.getByRole('button', { name: 'Deletar Conta' }).click();
  await app.confirm('Cancelar');

  await expect(app.dialog()).toBeHidden();
  expect(app.api.calls.some((call) => call.path === '/auth/delete')).toBe(false);
});

test('sair volta para o login e limpa a sessão', async ({ app }) => {
  await app.launch();

  await app.page.getByRole('button', { name: 'Sair' }).click();
  await app.confirm('Sair');

  await expect(app.page.getByText('Bem-vindo de volta')).toBeVisible();
  // `signOut` sobrescreve o registro com token nulo, em vez de apagar a chave.
  // A escrita é assíncrona (fila do `InteractionManager`), por isso esperamos.
  await expect.poll(async () => JSON.parse((await stored(app, 'auth_session_v1')) ?? '{}').token).toBeNull();
});
