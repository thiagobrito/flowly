/**
 * Home/Tasks: o dia do usuário.
 *
 * É a tela de abertura e a que concentra escrita — concluir, desfazer, subtarefa,
 * filtro e modo de energia. Cada teste confere a mudança na interface *e* a
 * chamada correspondente, porque um dos jeitos de quebrar aqui é a tela mudar
 * sozinha (otimismo local) sem o servidor receber nada.
 */

import { expect, test } from '../support/fixtures';
import { findLeakedText } from '../support/invariants';

test.describe('lista do dia', () => {
  test('mostra pendentes e concluídas separadas', async ({ app }) => {
    await app.launch();

    await expect(app.page.getByText('Escrever proposta comercial')).toBeVisible();
    await expect(app.page.getByText('Meditar 10 minutos')).toBeVisible();
    await expect(app.page.getByText('Ir à academia')).toBeVisible();
    await expect(app.page.getByText('1 atividades já concluídas')).toBeVisible();
    await expect(app.page.getByText('Ler 20 páginas')).toBeVisible();
    // Tarefa de amanhã não aparece no recorte de hoje.
    await expect(app.page.getByText('Revisar orçamento do mês')).toHaveCount(0);
  });

  test('conta nova abre sem atividades e sem texto vazado', async ({ app }) => {
    await app.launch({ scenario: 'newAccount' });

    await expect(app.page.getByText('0 atividades já concluídas')).toBeVisible();
    expect(await findLeakedText(app.page)).toEqual([]);
  });

  test('detalhes e subtarefas aparecem ao expandir', async ({ app }) => {
    await app.launch();

    await app.tap(app.page.getByRole('button', { name: 'Mostrar detalhes', exact: true }).first());

    await expect(app.page.getByText('Fechar o escopo antes de enviar')).toBeVisible();
    await expect(app.page.getByRole('button', { name: 'Levantar requisitos', exact: true })).toBeVisible();
    await expect(app.page.getByRole('button', { name: 'Revisar preço', exact: true })).toBeVisible();
  });
});

test.describe('concluir e desfazer', () => {
  test('concluir move a atividade e registra no servidor', async ({ app }) => {
    await app.launch();

    await app.tap(app.page.getByRole('button', { name: 'Concluir Meditar 10 minutos', exact: true }));

    await expect(app.page.getByText('2 atividades já concluídas')).toBeVisible();
    const complete = app.api.calls.filter((call) => call.path === '/tasks/complete');
    expect(complete).toHaveLength(1);
    expect(app.world.tasks.find((item) => item._id === 'task-meditar')?.completed).toHaveLength(1);
  });

  test('desfazer devolve a atividade para as pendentes', async ({ app }) => {
    await app.launch();

    await app.tap(app.page.getByRole('button', { name: 'Desfazer Ler 20 páginas', exact: true }));

    await expect(app.page.getByText('0 atividades já concluídas')).toBeVisible();
    expect(app.api.calls.filter((call) => call.path === '/tasks/undo')).toHaveLength(1);
    expect(app.world.tasks.find((item) => item._id === 'task-ler')?.completed).toEqual([]);
  });

  test('falha ao concluir devolve a atividade para a lista', async ({ app }) => {
    await app.launch();
    app.allowFailures();
    app.world.failures = [{ pattern: /^\/tasks\/complete$/, status: 500 }];

    await app.tap(app.page.getByRole('button', { name: 'Concluir Meditar 10 minutos', exact: true }));

    // O card reverte: a atividade não pode desaparecer com a escrita rejeitada.
    await expect(app.page.getByText('Meditar 10 minutos')).toBeVisible();
    await expect(app.page.getByText('1 atividades já concluídas')).toBeVisible();
  });

  test('marcar subtarefa envia o estado ao servidor', async ({ app }) => {
    await app.launch();

    await app.tap(app.page.getByRole('button', { name: 'Mostrar detalhes', exact: true }).first());
    await app.tap(app.page.getByRole('button', { name: 'Revisar preço', exact: true }));

    await expect.poll(() => app.api.calls.some((call) => call.path === '/tasks/subtask')).toBe(true);
    expect(app.world.tasks.find((item) => item._id === 'task-proposta')?.subtasks?.find((item) => item.id === 'sub-2')?.done).toBe(true);
  });
});

test.describe('editar e deletar pelo card', () => {
  test('deletar pede confirmação e remove no servidor', async ({ app }) => {
    await app.launch();

    // Arrastar para a esquerda é a própria ação de deletar (para a direita, editar).
    await app.swipe(app.page.getByText('Meditar 10 minutos', { exact: true }), 'left');
    await expect(app.dialog()).toContainText('Deseja remover "Meditar 10 minutos"?');
    await app.confirm('Deletar');

    await expect(app.page.getByText('Meditar 10 minutos')).toHaveCount(0);
    await expect.poll(() => app.world.tasks.map((item) => item._id)).not.toContain('task-meditar');
  });

  test('cancelar a exclusão mantém a atividade', async ({ app }) => {
    await app.launch();

    await app.swipe(app.page.getByText('Meditar 10 minutos', { exact: true }), 'left');
    await app.confirm('Cancelar');

    await expect(app.page.getByText('Meditar 10 minutos')).toBeVisible();
    expect(app.api.calls.filter((call) => call.method === 'DELETE' && call.path === '/tasks')).toEqual([]);
  });
});

test.describe('filtros', () => {
  test('filtra por sem data e volta para todas', async ({ app }) => {
    await app.launch();

    await app.page.getByRole('button', { name: 'Filtros' }).click();
    await app.page.getByRole('checkbox', { name: 'Sem data' }).click();

    await expect(app.page.getByText('Marcar dentista')).toBeVisible();
    await expect(app.page.getByText('Meditar 10 minutos')).toHaveCount(0);

    await app.page.getByRole('button', { name: 'Mostrar todas' }).click();
    await expect(app.page.getByText('Meditar 10 minutos')).toBeVisible();
  });

  test('filtra por objetivo', async ({ app }) => {
    await app.launch();

    await app.page.getByRole('button', { name: 'Filtros' }).click();
    await app.page.getByRole('checkbox', { name: 'Career' }).click();
    await app.page.getByRole('button', { name: 'Fechar', exact: true }).click();

    await expect(app.page.getByText('Escrever proposta comercial')).toBeVisible();
    await expect(app.page.getByText('Meditar 10 minutos')).toHaveCount(0);
  });

  test('amanhã mostra o que está agendado para o dia seguinte', async ({ app }) => {
    await app.launch();

    await app.page.getByRole('button', { name: 'Filtros' }).click();
    await app.page.getByRole('checkbox', { name: 'Amanhã' }).click();

    await expect(app.page.getByText('Revisar orçamento do mês')).toBeVisible();
  });
});

test.describe('modo de energia', () => {
  test('escolher um modo persiste a decisão do dia', async ({ app }) => {
    await app.launch();

    await app.page.getByRole('button', { name: 'Ajustar modo de energia' }).click();
    await app.page.getByRole('button', { name: 'Tô com 30%' }).click();

    await expect.poll(async () => JSON.parse((await app.page.evaluate(() => window.localStorage.getItem('energy_mode_v1'))) ?? '{}').mode).toBe('low');
  });
});

test.describe('sugestões do coach', () => {
  test('dispensar uma sugestão avisa o servidor e some da lista', async ({ app }) => {
    await app.launch();

    await expect(app.page.getByText('Comece pela proposta comercial')).toBeVisible();
    await app.page.getByRole('button', { name: 'Dispensar' }).first().click();

    await expect(app.page.getByText('Comece pela proposta comercial')).toHaveCount(0);
    await expect.poll(() => app.api.calls.some((call) => call.path === '/ai/coach-suggestions/feedback')).toBe(true);
  });
});

test.describe('resiliência', () => {
  test('API em 500 não deixa a tela quebrada', async ({ app }) => {
    await app.launch({ scenario: 'serverError' });

    // A barra de tabs continua utilizável: o erro não pode derrubar a casca do app.
    await expect(app.page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
    expect(await findLeakedText(app.page)).toEqual([]);
    expect(app.console.relevant()).toEqual([]);
  });

  test('sessão expirada (401) não quebra a tela', async ({ app }) => {
    await app.launch({ scenario: 'unauthorized' });

    await expect(app.page.getByRole('button', { name: 'Home', exact: true })).toBeVisible();
    expect(await findLeakedText(app.page)).toEqual([]);
    expect(app.console.relevant()).toEqual([]);
  });

  test('a abertura não repete requisições (detector de loop de refetch)', async ({ app }) => {
    await app.launch();
    await expect(app.page.getByText('Escrever proposta comercial')).toBeVisible();

    // `GET /subscription` sai duas vezes no boot: `useSubscription` é montado
    // pela Home e pela tela de Tasks, e o hook não deduplica como o React
    // Query faria. Não é regressão — é o estado atual, travado aqui para não
    // piorar. Qualquer outra rota repetida indica loop de refetch.
    expect(app.api.duplicates()).toEqual([{ key: 'GET /subscription', count: 2 }]);
  });
});
