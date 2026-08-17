/**
 * Assistente de voz: criar atividade sem formulário.
 *
 * O ditado é simulado pelo reconhecedor falso de `e2e/support/speech.ts` — em
 * Chromium headless o reconhecimento real depende do serviço de fala do Google.
 * O que está sob teste é o que o app faz com o texto: parser local pt-BR,
 * fallback no backend e a escrita final.
 */

import type { Page } from '@playwright/test';

import { expect, test } from '../support/fixtures';

/** Abre o overlay do assistente a partir da Home. */
async function openAssistant(app: { page: Page }) {
  await app.page.getByRole('button', { name: 'Assistente de voz' }).click();
  await expect(app.page.getByText('O que você deseja?')).toBeVisible();
}

test('ditado completo cria a atividade', async ({ app }) => {
  await app.launch({ speech: true });
  await openAssistant(app);

  await app.speak('criar tarefa');
  await expect(app.page.getByText('Qual o nome da tarefa?')).toBeVisible();

  await app.speak('Comprar presente da Ana');
  await expect(app.page.getByText('Quando a tarefa será feita?')).toBeVisible();

  await app.speak('amanhã às 9 da manhã');
  await expect(app.page.getByText('Qual área é a sua tarefa?')).toBeVisible();

  await app.speak('saúde');
  await expect(app.page.getByText('Confirme sua tarefa')).toBeVisible();
  await expect(app.page.getByText('Comprar presente da Ana')).toBeVisible();

  await app.page.getByRole('button', { name: 'Concluir', exact: true }).click();

  await expect.poll(() => app.world.tasks.map((item) => item.name)).toContain('Comprar presente da Ana');
  // O parser local resolveu a data: a tarefa nasce agendada, não sem data.
  expect(app.world.tasks.find((item) => item.name === 'Comprar presente da Ana')?.frequency.kind).toBe('once');
});

test('editar leva o rascunho ditado para o formulário', async ({ app }) => {
  await app.launch({ speech: true });
  await openAssistant(app);

  await app.speak('criar tarefa');
  await app.speak('Levar o carro na revisão');
  await app.speak('sem data definida');
  await app.speak('casa');
  await app.page.getByRole('button', { name: 'Editar', exact: true }).click();

  await expect(app.page.getByPlaceholder('Ex: Meditar 10 minutos')).toHaveValue('Levar o carro na revisão');
});

// Degradação graciosa: `/ai/parse-task-field` não existe no backend (404 por
// design). Sem o fallback, o passo travaria; com ele, o app pede de novo.
test('sem o endpoint de interpretação, o app pede a data de novo', async ({ app }) => {
  await app.launch({ speech: true });
  await openAssistant(app);

  await app.speak('criar tarefa');
  await app.speak('Renovar o passaporte');
  await app.speak('quando sobrar um tempo');

  await expect(app.page.getByText('Não entendi a data.')).toBeVisible();
  await expect.poll(() => app.api.calls.some((call) => call.path === '/ai/parse-task-field' && call.status === 404)).toBe(true);
  // Continua no mesmo passo, sem avançar com dado inventado.
  await expect(app.page.getByText('Quando a tarefa será feita?')).toBeVisible();
});

test('intenção desconhecida orienta o que dizer', async ({ app }) => {
  await app.launch({ speech: true });
  await openAssistant(app);

  await app.speak('tocar uma música');

  await expect(app.page.getByText('Não entendi. Por enquanto, você pode dizer "Criar tarefa".')).toBeVisible();
});

test('sem reconhecimento de fala, a tela convida a tocar no microfone', async ({ app }) => {
  await app.launch();
  await openAssistant(app);

  await expect(app.page.getByText('Toque para falar')).toBeVisible();
  await app.page.getByRole('button', { name: 'Fechar assistente' }).click();
  await expect(app.page.getByText('Ordenado pela sua energia')).toBeVisible();
});
