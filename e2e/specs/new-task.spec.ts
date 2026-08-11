/**
 * Criação e edição de atividade.
 *
 * O formulário é a porta de entrada de todo dado do app, então o que importa
 * aqui é o payload que sai: nome, frequência e área são obrigatórios, e a edição
 * precisa mandar `isEditing` com o `id` — sem isso o backend cria uma cópia em
 * vez de atualizar.
 */

import { expect, test } from '../support/fixtures';

const NAME_FIELD = 'Ex: Meditar 10 minutos';

test('cria uma atividade e ela aparece na Home', async ({ app }) => {
  await app.launch();
  await app.tab('new');

  await app.page.getByPlaceholder(NAME_FIELD).fill('Tomar 2 litros de água');
  await app.page.getByRole('button', { name: 'Diária', exact: true }).click();
  await app.page.getByRole('button', { name: 'Saúde', exact: true }).click();
  await app.page.getByRole('button', { name: 'Criar atividade' }).click();

  await expect(app.page.getByText('Tomar 2 litros de água')).toBeVisible();
  const created = app.world.tasks.find((item) => item.name === 'Tomar 2 litros de água');
  expect(created?.frequency).toMatchObject({ kind: 'daily' });
});

test('sem nome, frequência ou área o envio fica bloqueado', async ({ app }) => {
  await app.launch();
  await app.tab('new');

  const submit = app.page.getByRole('button', { name: 'Criar atividade' });
  await expect(submit).toBeDisabled();

  await app.page.getByPlaceholder(NAME_FIELD).fill('Só o nome');
  await expect(submit).toBeDisabled();

  await app.page.getByRole('button', { name: 'Qualquer hora', exact: true }).click();
  // Frequência escolhida, mas ainda falta a área da vida.
  await expect(submit).toBeDisabled();

  await app.page.getByRole('button', { name: 'Saúde', exact: true }).click();
  await expect(submit).toBeEnabled();
  expect(app.api.calls.filter((call) => call.path === '/tasks' && call.method === 'PUT')).toEqual([]);
});

test('subtarefas entram e saem antes de salvar', async ({ app }) => {
  await app.launch();
  await app.tab('new');

  await app.page.getByPlaceholder('Ex: Comprar leite').fill('Reservar hotel');
  await app.page.getByRole('button', { name: 'Adicionar sub-tarefa' }).click();

  await expect(app.page.getByText('Reservar hotel')).toBeVisible();
  await app.page.getByRole('button', { name: 'Remover Reservar hotel' }).click();
  await expect(app.page.getByText('Reservar hotel')).toHaveCount(0);
});

test('editar uma atividade atualiza em vez de duplicar', async ({ app }) => {
  await app.launch();

  // Editar é um swipe para a direita no card, como no app.
  await app.swipe(app.page.getByText('Meditar 10 minutos'), 'right');
  await expect(app.page.getByText('Editar atividade')).toBeVisible();

  await app.page.getByPlaceholder(NAME_FIELD).fill('Meditar 20 minutos');
  await app.page.getByRole('button', { name: 'Salvar alterações' }).click();

  await expect(app.page.getByText('Meditar 20 minutos')).toBeVisible();
  expect(app.world.tasks.filter((item) => item.name.startsWith('Meditar'))).toHaveLength(1);
});

test('a estimativa de tempo vai no payload', async ({ app }) => {
  await app.launch();
  await app.tab('new');

  await app.page.getByPlaceholder(NAME_FIELD).fill('Estudar inglês');
  await app.page.getByRole('button', { name: '30min', exact: true }).click();
  await app.page.getByRole('button', { name: 'Qualquer hora', exact: true }).click();
  await app.page.getByRole('button', { name: 'Estudos', exact: true }).click();
  await app.page.getByRole('button', { name: 'Criar atividade' }).click();

  await expect.poll(() => app.world.tasks.find((item) => item.name === 'Estudar inglês')?.estimatedMinutes).toBe(30);
});

test('falha de rede na criação mantém o formulário preenchido', async ({ app }) => {
  await app.launch();
  app.allowFailures();
  await app.tab('new');
  app.world.failures = [{ pattern: /^\/tasks$/, status: 500 }];

  await app.page.getByPlaceholder(NAME_FIELD).fill('Atividade que falha');
  await app.page.getByRole('button', { name: 'Qualquer hora', exact: true }).click();
  await app.page.getByRole('button', { name: 'Casa', exact: true }).click();
  await app.page.getByRole('button', { name: 'Criar atividade' }).click();

  // Continua no formulário, com o texto digitado — nada é perdido.
  await expect(app.page.getByPlaceholder(NAME_FIELD)).toHaveValue('Atividade que falha');
});
