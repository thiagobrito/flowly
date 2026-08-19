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

/**
 * Cor do gradiente de fundo do app.
 *
 * A metade do estilo que vem de `style={{ ... }}` calculado em JS não aparece
 * na classe do `<html>`, e é justamente ela que já ficou clara enquanto as
 * classes `dark:` iam para o escuro. O fundo é o representante mais barato
 * desse grupo: se ele virou, o `isDark` do app virou junto.
 */
function backgroundGradient(app: { page: Page }) {
  return app.page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('div'));
    const gradient = nodes.map((node) => getComputedStyle(node).backgroundImage).find((image) => image.includes('linear-gradient'));
    return gradient ?? '';
  });
}

test('abre as configurações e volta para a Home', async ({ app }) => {
  await app.launch();
  await app.page.getByRole('button', { name: 'Configurações' }).click();

  await expect(app.page.getByText('Configurações', { exact: true })).toBeVisible();
  await expect(app.page.getByText('APARÊNCIA')).toBeVisible();
  await expect(app.page.getByText('NOTIFICAÇÕES')).toBeVisible();
  await expect(app.page.getByText('INTEGRAÇÕES')).toBeVisible();

  await app.page.getByRole('button', { name: 'Voltar' }).click();
  await expect(app.page.getByText('Por horário')).toBeVisible();
});

test('escolher o tema escuro persiste a preferência', async ({ app }) => {
  await app.launch();
  await app.page.getByRole('button', { name: 'Configurações' }).click();

  await app.page.getByRole('button', { name: 'Escuro' }).click();

  await expect.poll(() => stored(app, 'theme_mode_v1')).toBe('dark');
  // O NativeWind aplica o modo escuro pela classe no `<html>`: é o efeito
  // visível de ter salvado a preferência, não só o valor no storage.
  await expect.poll(() => app.page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  // E as cores calculadas em JS têm que ter ido junto: o creme (#F6F1E7) sai,
  // o neutro quente escuro (#151310) entra.
  await expect.poll(() => backgroundGradient(app)).toContain('rgb(21, 19, 16)');
});

test('o tema do sistema vale quando a preferência é Sistema', async ({ app }) => {
  await app.page.emulateMedia({ colorScheme: 'dark' });
  await app.launch({ state: { theme: 'system' } });

  // As duas metades do estilo seguem o aparelho: a classe do `<html>`, que
  // resolve as variantes `dark:`, e o gradiente, que vem de `isDark`.
  await expect.poll(() => app.page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  await expect.poll(() => backgroundGradient(app)).toContain('rgb(21, 19, 16)');
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
