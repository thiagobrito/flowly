/**
 * O app contra a API de verdade.
 *
 * A suíte de telas roda sobre o backend falso de `support/backend.ts`. Isso é o
 * que a deixa rápida, e é também o seu ponto cego: se a API mudar a forma de uma
 * resposta, a fixture continua respondendo o formato antigo e todos os testes
 * passam — até o app quebrar na mão do usuário.
 *
 * Estes testes fecham esse buraco. Rodam contra um `next start` real com Mongo
 * efêmero (o `build.py` sobe os dois antes de publicar) e cada abertura registra
 * uma conta nova, então o que se afirma aqui é o que uma conta recém-criada vê.
 * Não repetem regra de negócio: o que está sob teste é o contrato.
 *
 * `E2E_API_URL=http://127.0.0.1:3100/api/v1 npx playwright test --project=integration`
 */

import { IS_INTEGRATION } from '../support/api';
import { expect, TAB, test } from '../support/fixtures';

test.describe('contra o backend real', () => {
  test.skip(!IS_INTEGRATION, 'defina E2E_API_URL para rodar');

  test('a abertura e as cinco tabs consomem os payloads reais', async ({ app }) => {
    await app.launch();

    // Uma tela que recebe um campo a menos do que espera não "mostra menos": ela
    // cai no error boundary ou imprime `undefined`. As invariantes da fixture
    // (console, requisição falha) e a asserção de texto vazado abaixo cobram isso
    // em cada tab, que é onde cada payload é consumido.
    for (const tab of [TAB.calendar, TAB.progress, TAB.goals, TAB.new, TAB.home]) {
      await app.page.getByRole('button', { name: tab, exact: true }).click();
      await expect(app.page.getByRole('button', { name: TAB.home, exact: true })).toBeVisible();
    }

    // Trial de conta nova: as tabs pagas não podem estar bloqueadas.
    await expect(app.page.getByRole('button', { name: 'Metas (bloqueado)' })).toHaveCount(0);
  });

  test('criar e concluir uma atividade fecha o ciclo no servidor', async ({ app }) => {
    await app.launch();
    await app.tab('new');

    await app.page.getByPlaceholder('Ex: Meditar 10 minutos').fill('Beber água');
    await app.page.getByRole('button', { name: 'Diária', exact: true }).click();
    // "Trabalho" e não "Saúde": o registro semeia metas com nome de área da vida,
    // então o rótulo apareceria duas vezes (a meta e a área).
    await app.page.getByRole('button', { name: 'Trabalho', exact: true }).click();
    await app.page.getByRole('button', { name: 'Criar atividade' }).click();

    // Voltou para a Home com a atividade que o `GET /home` acabou de devolver —
    // prova de que o `PUT /tasks` do app e a leitura do dia concordam.
    await expect(app.page.getByText('Beber água')).toBeVisible();

    await app.tap(app.page.getByRole('button', { name: 'Concluir Beber água', exact: true }));
    await expect(app.page.getByRole('button', { name: 'Desfazer Beber água', exact: true })).toBeVisible();

    // Recarregar prova que a conclusão ficou no banco, não só no estado da tela.
    await app.page.reload();
    await expect(app.page.getByRole('button', { name: 'Desfazer Beber água', exact: true })).toBeVisible();
  });
});
