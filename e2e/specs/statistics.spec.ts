/**
 * Estatísticas: progresso do dia, sono e revisão semanal.
 *
 * Esta tela é a mais sensível a mudança de contrato: ela consome `GET /report`
 * inteiro e quebra com qualquer campo derivado ausente. Foi assim que a fixture
 * incompleta apareceu — o teste de tela branca abaixo é o guarda dessa regressão.
 */

import { expect, test } from '../support/fixtures';
import { findLeakedText } from '../support/invariants';

test('mostra o progresso do dia com os números do relatório', async ({ app }) => {
  await app.launch();
  await app.tab('progress');

  await expect(app.page.getByText('Tarefas concluídas').first()).toBeVisible();
  await expect(app.page.getByText('Pontos de Impacto')).toBeVisible();
  await expect(app.page.getByText('Ler 20 páginas')).toBeVisible();
  expect(await findLeakedText(app.page)).toEqual([]);
});

test('o card de sono reflete o perfil salvo', async ({ app }) => {
  await app.launch();
  await app.tab('progress');

  await expect(app.page.getByText('Sono', { exact: true })).toBeVisible();
  await expect(app.page.getByText('23:00 – 07:00')).toBeVisible();
  await expect(app.page.getByText('Meta: 8h')).toBeVisible();
});

test('ajustar horários de sono salva no servidor', async ({ app }) => {
  await app.launch();
  await app.tab('progress');

  await app.tap(app.page.getByRole('button', { name: 'Ajustar horários de sono' }));
  await expect(app.page.getByText('Ajustar horários')).toBeVisible();

  // Passo de 15 min sobre 07:00 — a correção vale para a noite exibida, não
  // para os horários usuais, que já estão preenchidos.
  await app.page.getByRole('button', { name: 'Aumentar Acordei às' }).click();
  await app.page.getByRole('button', { name: 'Salvar', exact: true }).click();

  await expect.poll(() => Object.values(app.world.sleepProfile?.overrides ?? {}).map((night) => night.wakeTime)).toContain('07:15');
});

test('sem perfil de sono, o app leva direto para o card de sono', async ({ app }) => {
  await app.launch({
    state: { sleepConfigured: false },
    // O servidor também precisa não ter perfil, senão a hidratação remota preenche.
    world: (world) => {
      world.sleepProfile = { hasDevice: null, usualWakeTime: null, usualBedTime: null, overrides: {} };
    },
  });

  // A Home decide sozinha ir para Estatísticas quando falta o perfil.
  await expect(app.page.getByText('Você usa um dispositivo').or(app.page.getByText('Sono')).first()).toBeVisible();
});

test('a revisão semanal abre a partir das estatísticas', async ({ app }) => {
  await app.launch();
  await app.tab('progress');

  await app.page.getByRole('button', { name: 'Abrir revisão semanal' }).click();

  await expect(app.page.getByText(/[Rr]evisão [Ss]emanal/).first()).toBeVisible();
  expect(app.console.relevant()).toEqual([]);
});

test('relatório em 500 não deixa a tela em branco', async ({ app }) => {
  await app.launch({ scenario: 'serverError' });
  await app.tab('progress');

  // A tela pode mostrar carregando ou vazio, mas a navegação tem de sobreviver.
  await expect(app.page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
  expect(app.console.relevant()).toEqual([]);
});
