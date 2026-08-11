/**
 * Metas: leitura do ciclo, edição e criação pela anamnese.
 *
 * A tela consome campos derivados que o documento salvo não tem (progresso,
 * momentum, saúde da meta). Se o servidor mudar a forma da resposta, é aqui que
 * aparece — a fixture espelha `buildGoals` do backend.
 */

import { expect, test } from '../support/fixtures';

test('mostra a meta principal e a secundária com progresso e RPM', async ({ app }) => {
  await app.launch();
  await app.tab('goals');

  await expect(app.page.getByText('Faturar 30 mil por mês', { exact: true })).toBeVisible();
  await expect(app.page.getByText('Meta principal')).toBeVisible();
  await expect(app.page.getByText('Correr 10 km sem parar', { exact: true })).toBeVisible();
  await expect(app.page.getByText('Meta secundária')).toBeVisible();

  // RPM e métricas são o miolo da tela: sem eles, a meta é só um título.
  await expect(app.page.getByText('Resultado').first()).toBeVisible();
  await expect(app.page.getByText('Faturamento mensal')).toBeVisible();
  await expect(app.page.getByText('18000 / 30000')).toBeVisible();
});

test('editar o nome da meta persiste no servidor', async ({ app }) => {
  await app.launch();
  await app.tab('goals');

  await app.page.getByRole('button', { name: 'Editar meta Faturar 30 mil por mês' }).click();
  await app.page.getByPlaceholder('Ex.: Reduzir gordura para 15%').fill('Faturar 50 mil por mês');
  await app.page.getByRole('button', { name: 'Salvar meta' }).click();

  await expect.poll(() => app.world.goals[0]?.name).toBe('Faturar 50 mil por mês');
  await expect(app.page.getByText('Faturar 50 mil por mês')).toBeVisible();
});

test('conta nova cria o ciclo pela anamnese', async ({ app }) => {
  await app.launch({ scenario: 'newAccount' });
  await app.tab('goals');

  await expect(app.page.getByText('Defina sua primeira meta')).toBeVisible();
  await app.page.getByRole('button', { name: 'Criar meta' }).click();

  await app.page.getByRole('button', { name: 'Começar' }).click();
  await app.page.getByRole('button', { name: 'Saúde', exact: true }).click();
  await app.page.getByRole('button', { name: 'Continuar' }).click();

  await app.page.locator('input').first().fill('Correr uma maratona');
  await app.page.getByRole('button', { name: 'Criar meu ciclo' }).click();

  // O POST cria o ciclo inteiro; a tela recarrega pelo GET.
  await expect.poll(() => app.api.calls.some((call) => call.method === 'POST' && call.path === '/goals/anamnesis')).toBe(true);
  await expect(app.page.getByText('Correr uma maratona')).toBeVisible();
});

test('excluir a meta secundária pede confirmação', async ({ app }) => {
  await app.launch();
  await app.tab('goals');

  await app.page.getByRole('button', { name: 'Editar meta Correr 10 km sem parar' }).click();
  await app.page.getByRole('button', { name: 'Excluir meta' }).click();
  await app.confirm('Excluir');

  await expect.poll(() => app.world.goals.map((goal) => goal.name)).not.toContain('Correr 10 km sem parar');
  await expect(app.page.getByText('Correr 10 km sem parar', { exact: true })).toBeHidden();
});

test('metas em 500 não deixam a tela em branco', async ({ app }) => {
  await app.launch({ scenario: 'serverError' });
  await app.tab('goals');

  await expect(app.page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
});
