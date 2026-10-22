/**
 * Calendário: agenda do dia e agendamento por arraste.
 *
 * A grade vem do `@howljs/calendar-kit`, então o foco é o que o app põe nela —
 * as tarefas com horário — e a navegação entre dias.
 */

import { expect, test } from '../support/fixtures';
import { todayKey } from '../support/state';

test('mostra o dia atual com as atividades agendadas', async ({ app }) => {
  await app.launch();
  await app.tab('calendar');

  await expect(app.page.getByText('Calendário')).toBeVisible();
  await expect(app.page.getByText('Escrever proposta comercial')).toBeVisible();
  // Diárias sem hora entram como sugestão do dia, com duração padrão.
  await expect(app.page.getByText('Meditar 10 minutos')).toBeVisible();
});

test('remover do dia desagenda a atividade', async ({ app }) => {
  await app.launch();
  await app.tab('calendar');

  // O evento da grade é renderizado pelo `calendar-kit` sem role de botão.
  await app.tap(app.page.getByText('Escrever proposta comercial').first());
  await app.page.getByRole('button', { name: 'Remover do dia' }).click();

  // Tarefa `once` não tem slot para apagar: o app zera a frequência com um PUT
  // (`syncOnceTaskUnschedule`), e é o servidor que a devolve para a bandeja.
  await expect.poll(() => app.world.tasks.find((item) => item._id === 'task-proposta')?.frequency.kind).toBe('notime');
  await expect(app.page.getByText('Escrever proposta comercial')).toBeVisible();
});

test('navegar entre dias mantém a grade de pé', async ({ app }) => {
  await app.launch();
  await app.tab('calendar');

  // A troca de página é do `calendar-kit`, que sob RN Web não repagina headless.
  // O que dá para garantir aqui é que os controles existem e não derrubam a tela;
  // a repaginação em si é território de teste manual no device.
  await app.page.getByRole('button', { name: 'Próximo' }).click();
  await app.page.getByRole('button', { name: 'Anterior' }).click();

  await expect(app.page.getByRole('button', { name: /\d+ de [a-zç]+$/i }).first()).toBeVisible();
  expect(app.console.relevant()).toEqual([]);
});

test('tarefa só com data fica no topo da lista e fora da grade', async ({ app }) => {
  await app.launch();
  await app.tab('new');

  await app.page.getByPlaceholder('Ex: Meditar 10 minutos').fill('Buscar encomenda');
  await app.page.getByRole('button', { name: 'Data específica', exact: true }).click();
  await app.page.getByRole('button', { name: 'Hoje', exact: true }).click();
  await app.page.getByRole('button', { name: 'Saúde', exact: true }).click();
  await app.page.getByRole('button', { name: 'Criar atividade' }).click();

  const created = app.world.tasks.find((item) => item.name === 'Buscar encomenda');
  expect(created?.frequency).toEqual({ kind: 'once', date: todayKey(), time: null });
  expect(created?.schedule ?? []).toEqual([]);

  await app.tab('calendar');

  const tray = app.page.getByLabel('Atividades sem horário');
  await expect(tray.getByRole('button').first()).toContainText('Buscar encomenda');
  await expect(tray.getByText('Buscar encomenda')).toBeVisible();
  await expect(app.page.getByText('Buscar encomenda')).toHaveCount(1);
});

test('conta nova abre o calendário vazio sem erro', async ({ app }) => {
  await app.launch({ scenario: 'newAccount' });
  await app.tab('calendar');

  await expect(app.page.getByText('Calendário')).toBeVisible();
  expect(app.console.relevant()).toEqual([]);
});
