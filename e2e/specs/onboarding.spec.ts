/**
 * Onboarding: 12 passos, retomada e degradação graciosa.
 *
 * `GET /onboarding` não existe no backend. O app trata isso em silêncio e usa o
 * roteiro padrão de `src/screens/Onboarding/data.ts` — comportamento verificado
 * aqui para que a ausência do endpoint nunca vire tela branca.
 */

import { expect, test } from '../support/fixtures';

/**
 * Passos na ordem de `DEFAULT_ONBOARDING`, com o rótulo que avança cada um.
 *
 * Os dois passos de permissão avançam pelo "Agora não": no browser a permissão é
 * negada e o app responde com `Alert.alert`, que o RN Web não implementa. O
 * caminho da permissão concedida é específico de device e fica fora deste harness.
 */
const STEPS: { title: string; clicks: (string | RegExp)[] }[] = [
  { title: 'Escolha seu idioma', clicks: ['Continuar'] },
  { title: 'Quem define metas com prazo', clicks: ['Vamos começar'] },
  { title: 'Bem-vindo ao Flowly', clicks: ['Continuar'] },
  { title: 'Ative as notificações', clicks: ['Agora não'] },
  { title: 'Fale com o Flowly', clicks: ['Agora não'] },
  // Sem dispositivo de sono, o passo pede os horários usuais antes de avançar.
  { title: 'Sua energia ao longo do dia', clicks: [/^Não uso/, 'Salvar e continuar'] },
  { title: 'Seu ritmo de hoje', clicks: ['Continuar'] },
  { title: 'Pequenas ações repetidas', clicks: ['Continuar'] },
  { title: 'Defina seus objetivos', clicks: ['Pular por agora'] },
  { title: 'Crie suas atividades', clicks: ['Pular por agora'] },
  { title: 'Desbloqueie todo o Flowly', clicks: ['Continuar sem assinar'] },
  { title: 'Tudo pronto!', clicks: ['Entrar no Flowly'] },
];

const pending = { onboardingCompleted: false } as const;

test('percorre os 12 passos e entra no app', async ({ app }) => {
  await app.launch({ route: '/onboarding', state: pending, waitForTabs: false });

  for (const [index, step] of STEPS.entries()) {
    await expect(app.page.getByText(step.title, { exact: false }).first(), `passo ${index + 1}: ${step.title}`).toBeVisible();
    await expect(app.page.getByText(`Etapa ${index + 1} de 12`)).toBeVisible();

    for (const name of step.clicks) {
      await app.page
        .getByRole('button', { name, exact: typeof name === 'string' })
        .first()
        .click();
    }
  }

  await expect(app.page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
  // Concluir precisa persistir a flag, senão o guard devolve o usuário ao fluxo.
  expect(JSON.parse((await app.page.evaluate(() => window.localStorage.getItem('onboarding_v2'))) ?? '{}')).toMatchObject({ completed: true });
});

test('sem o endpoint /onboarding, o roteiro padrão aparece', async ({ app }) => {
  await app.launch({ route: '/onboarding', state: pending, waitForTabs: false });

  await expect(app.page.getByText('Escolha seu idioma')).toBeVisible();
  const call = app.api.calls.find((item) => item.path === '/onboarding');
  expect(call?.status, 'o endpoint segue ausente; a tela não pode depender dele').toBe(404);
});

test('voltar retorna ao passo anterior', async ({ app }) => {
  await app.launch({ route: '/onboarding', state: { ...pending, onboardingStep: 2 }, waitForTabs: false });

  await expect(app.page.getByText('Bem-vindo ao Flowly')).toBeVisible();
  await app.page.getByRole('button', { name: 'Voltar' }).click();

  await expect(app.page.getByText('Quem define metas com prazo', { exact: false })).toBeVisible();
});

test('o progresso é retomado de onde parou', async ({ app }) => {
  await app.launch({ route: '/onboarding', state: { ...pending, onboardingStep: 5 }, waitForTabs: false });

  await expect(app.page.getByText('Etapa 6 de 12')).toBeVisible();
  await expect(app.page.getByText('Sua energia ao longo do dia')).toBeVisible();
});

test('a escolha de idioma persiste', async ({ app }) => {
  await app.launch({ route: '/onboarding', state: pending, waitForTabs: false });

  await app.page.getByText('Português (Brasil)').click();
  await app.page.getByRole('button', { name: 'Continuar' }).click();

  await expect(app.page.getByText('Quem define metas com prazo', { exact: false })).toBeVisible();
  expect(JSON.parse((await app.page.evaluate(() => window.localStorage.getItem('onboarding_v2'))) ?? '{}')).toMatchObject({ language: 'pt-BR' });
});

test('o paywall do onboarding abre e pode ser dispensado', async ({ app }) => {
  await app.launch({ route: '/onboarding', state: { ...pending, onboardingStep: 10 }, waitForTabs: false });

  await expect(app.page.getByText('Desbloqueie todo o Flowly')).toBeVisible();
  await app.page.getByRole('button', { name: 'Ver planos' }).click();

  await expect(app.page.getByRole('button', { name: 'Assinar agora' })).toBeVisible();
  await app.page.getByRole('button', { name: 'Fechar' }).click();

  // Fechar o paywall avança o passo em vez de travar o fluxo.
  await expect(app.page.getByText('Tudo pronto!')).toBeVisible();
});

test('criar meta a partir do onboarding usa a anamnese', async ({ app }) => {
  await app.launch({ route: '/onboarding', state: { ...pending, onboardingStep: 8 }, waitForTabs: false });

  await expect(app.page.getByText('Defina seus objetivos')).toBeVisible();
  await app.page.getByRole('button', { name: 'Definir meus objetivos' }).click();

  await expect(app.page.getByText('Vamos desenhar seu próximo ciclo')).toBeVisible();
  expect(app.api.calls.some((call) => call.path === '/goals/anamnesis')).toBe(true);
});
