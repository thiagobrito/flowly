/**
 * Login, cadastro e guards de rota.
 *
 * As mensagens de erro saem por `Alert.alert`, que o bundle de E2E troca pelo
 * shim de `e2e/support/alertShim.js` — por isso o texto de `toFriendlyMessage`
 * (em `src/lib/auth`) é verificável aqui, junto do efeito observável: a sessão
 * não é criada e o usuário permanece na tela.
 */

import { expect, test } from '../support/fixtures';

const EMAIL = 'e2e@flowly.app';
const PASSWORD = 'senha-forte-e2e';

test.describe('login', () => {
  test('entra com credenciais válidas e chega na Home', async ({ app }) => {
    await app.launch({ state: { token: null }, waitForTabs: false });

    await app.page.getByPlaceholder('Digite seu e-mail').fill(EMAIL);
    await app.page.getByPlaceholder('Digite sua senha').fill(PASSWORD);
    await app.page.getByRole('button', { name: 'Entrar' }).last().click();

    await expect(app.page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
    const login = app.api.calls.find((call) => call.path === '/auth/login');
    expect(login?.method).toBe('POST');
  });

  test('botão fica desabilitado sem e-mail e senha', async ({ app }) => {
    await app.launch({ state: { token: null }, waitForTabs: false });

    const submit = app.page.getByRole('button', { name: 'Entrar' }).last();
    await expect(submit).toBeDisabled();

    await app.page.getByPlaceholder('Digite seu e-mail').fill(EMAIL);
    await expect(submit).toBeDisabled();

    await app.page.getByPlaceholder('Digite sua senha').fill(PASSWORD);
    await expect(submit).toBeEnabled();
  });

  test('credencial recusada mantém o usuário no login', async ({ app }) => {
    await app.launch({ state: { token: null }, waitForTabs: false });
    app.allowFailures();
    app.world.failures = [{ pattern: /^\/auth\/login$/, status: 401, body: { error: 'Unauthorized' } }];

    await app.page.getByPlaceholder('Digite seu e-mail').fill(EMAIL);
    await app.page.getByPlaceholder('Digite sua senha').fill('senha-errada');
    await app.page.getByRole('button', { name: 'Entrar' }).last().click();

    await expect.poll(() => app.api.calls.some((call) => call.path === '/auth/login' && call.status === 401)).toBe(true);
    await expect(app.dialog()).toContainText('E-mail ou senha inválidos.');
    await app.confirm('OK');
    await expect(app.page.getByText('Bem-vindo de volta')).toBeVisible();
    // Nenhum token gravado: o guard continuaria mandando para o login.
    const stored = await app.page.evaluate(() => window.localStorage.getItem('auth_session_v1'));
    expect(stored === null || JSON.parse(stored).token === null).toBe(true);
  });

  test('navega para o cadastro e volta', async ({ app }) => {
    await app.launch({ state: { token: null }, waitForTabs: false });

    await app.page.getByRole('button', { name: 'Criar conta' }).first().click();
    await expect(app.page.getByText('Comece agora e organize seus dias com mais foco.')).toBeVisible();

    await app.page.getByRole('button', { name: 'Entrar' }).first().click();
    await expect(app.page.getByText('Bem-vindo de volta')).toBeVisible();
  });
});

test.describe('cadastro', () => {
  /** Preenche o formulário; `consent` marca o aceite da política. */
  async function fillSignup(app: any, { email = EMAIL, password = PASSWORD, confirm = PASSWORD, consent = true } = {}) {
    await app.page.getByPlaceholder('Digite seu e-mail').fill(email);
    await app.page.getByPlaceholder('Digite sua senha').fill(password);
    await app.page.getByPlaceholder('Confirme sua senha').fill(confirm);
    if (consent) await app.page.getByRole('checkbox').click();
  }

  test('cria a conta e cai no onboarding', async ({ app }) => {
    await app.launch({ route: '/create-account', state: { token: null }, waitForTabs: false });

    await fillSignup(app);
    await app.page.getByRole('button', { name: 'Criar conta' }).last().click();

    await expect(app.page.getByText('Escolha seu idioma')).toBeVisible();
    expect(app.api.calls.some((call) => call.path === '/auth/register' && call.method === 'POST')).toBe(true);
  });

  test('recusa e-mail inválido, senha curta, senha comum e confirmação divergente', async ({ app }) => {
    await app.launch({ route: '/create-account', state: { token: null }, waitForTabs: false });

    await app.page.getByPlaceholder('Digite seu e-mail').fill('sem-arroba');
    await expect(app.page.getByText('Informe um e-mail válido.')).toBeVisible();

    await app.page.getByPlaceholder('Digite seu e-mail').fill(EMAIL);
    await app.page.getByPlaceholder('Digite sua senha').fill('curta');
    await expect(app.page.getByText('A senha precisa ter pelo menos 8 caracteres.')).toBeVisible();

    await app.page.getByPlaceholder('Digite sua senha').fill('senha123');
    await expect(app.page.getByText('Essa senha é muito comum. Escolha uma mais difícil de adivinhar.')).toBeVisible();

    await app.page.getByPlaceholder('Digite sua senha').fill(PASSWORD);
    await app.page.getByPlaceholder('Confirme sua senha').fill('outra-coisa');
    await expect(app.page.getByText('As senhas não coincidem.')).toBeVisible();

    expect(app.api.calls.filter((call) => call.path === '/auth/register')).toEqual([]);
  });

  test('e-mail já cadastrado avisa em vez de criar de novo', async ({ app }) => {
    await app.launch({ route: '/create-account', state: { token: null }, waitForTabs: false });
    app.allowFailures();
    app.world.failures = [{ pattern: /^\/auth\/register$/, status: 409, body: { error: 'Conflict' } }];

    await fillSignup(app);
    await app.page.getByRole('button', { name: 'Criar conta' }).last().click();

    await expect(app.dialog()).toContainText('Este e-mail já está cadastrado.');
    await app.confirm('OK');
    await expect(app.page.getByText('Comece agora e organize seus dias com mais foco.')).toBeVisible();
  });

  test('sem aceitar a política, o cadastro fica bloqueado', async ({ app }) => {
    await app.launch({ route: '/create-account', state: { token: null }, waitForTabs: false });

    await fillSignup(app, { consent: false });
    const submit = app.page.getByRole('button', { name: 'Criar conta' }).last();
    await expect(submit).toBeDisabled();

    await app.page.getByRole('checkbox').click();
    await expect(submit).toBeEnabled();
  });
});

test.describe('guards de rota', () => {
  test('instalação nova abre no cadastro, não no login', async ({ app }) => {
    await app.launch({ state: { token: null, hasAccount: false }, waitForTabs: false });

    await expect(app.page.getByText('Comece agora e organize seus dias com mais foco.')).toBeVisible();
    expect(app.api.calls.filter((call) => call.path === '/home')).toEqual([]);
  });

  test('sem token, quem já teve conta no aparelho cai no login', async ({ app }) => {
    await app.launch({ state: { token: null }, waitForTabs: false });

    await expect(app.page.getByText('Bem-vindo de volta')).toBeVisible();
    // A Home nem chega a buscar dados sem sessão.
    expect(app.api.calls.filter((call) => call.path === '/home')).toEqual([]);
  });

  test('com onboarding pendente, a Home redireciona para o onboarding', async ({ app }) => {
    await app.launch({ state: { onboardingCompleted: false }, waitForTabs: false });

    await expect(app.page.getByText('Escolha seu idioma')).toBeVisible();
  });

  test('já autenticado, o login redireciona para a Home', async ({ app }) => {
    await app.launch({ route: '/login' });

    await expect(app.page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
  });
});

test.describe('sessão no boot', () => {
  test('com sessão salva, nenhuma chamada da abertura sai sem Authorization', async ({ app }) => {
    await app.launch();

    await expect.poll(() => app.api.calls.some((call) => call.path === '/events')).toBe(true);
    await expect.poll(() => app.api.calls.some((call) => call.path === '/home' || call.path === '/subscription')).toBe(true);

    const anonymous = app.api.calls.filter((call) => !call.authorized && call.path !== '/feature-flags').map((call) => `${call.method} ${call.path}`);
    expect(anonymous).toEqual([]);
  });

  test('403 de header ausente não desloga', async ({ app }) => {
    app.allowFailures();
    await app.launch({
      world: (world) => {
        world.failures = [{ pattern: /^\/subscription$/, status: 403, body: { error: 'Unauthorized', code: 'missing_authorization' } }];
      },
    });

    await expect.poll(() => app.api.calls.some((call) => call.path === '/subscription' && call.status === 403)).toBe(true);

    await expect(app.page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
    const stored = await app.page.evaluate(() => window.localStorage.getItem('auth_session_v1'));
    expect(JSON.parse(stored ?? '{}').token).toBeTruthy();
  });
});
