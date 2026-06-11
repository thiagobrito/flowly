import type { PrioritizableTask } from './priorization';
import { prioritizeTasks } from './priorization';

const NOW = new Date('2026-06-10T12:00:00');

const baseTask = (overrides: Partial<PrioritizableTask>): PrioritizableTask => ({
  id: 'task-id',
  randomId: 'random-id',
  name: 'Tarefa',
  area: 'work',
  frequency: { kind: 'interval', everyNDays: 1 },
  ...overrides,
});

describe('prioritizeTasks', () => {
  it('prioriza tarefa compatível com a energia atual mesmo com impacto menor', () => {
    const taskA = baseTask({ id: 'a', randomId: 'a', name: 'Tarefa A', energy: 2, impact: 1 });
    const taskB = baseTask({ id: 'b', randomId: 'b', name: 'Tarefa B', energy: 5, impact: 2 });

    const energyLevel = 2;
    const [first, second] = prioritizeTasks([taskB, taskA], energyLevel, NOW);

    expect(first).toBe(taskA);
    expect(second).toBe(taskB);
  });

  it('prioriza tarefa de maior impacto quando a energia atual comporta ambas', () => {
    const taskA = baseTask({ id: 'a', randomId: 'a', name: 'Tarefa A', energy: 2, impact: 1 });
    const taskB = baseTask({ id: 'b', randomId: 'b', name: 'Tarefa B', energy: 5, impact: 5 });

    const energyLevel = 5;
    const [first, second] = prioritizeTasks([taskB, taskA], energyLevel, NOW);

    expect(first).toBe(taskB);
    expect(second).toBe(taskA);
  });

  it('energia 1, leitura com energia e impacto 2, outra com 3 de energia e impacto 5, deve fazer o que da (menos energia)', () => {
    const taskA = baseTask({ id: 'a', randomId: 'a', name: 'Tarefa A', energy: 1, impact: 2 });
    const taskB = baseTask({ id: 'b', randomId: 'b', name: 'Tarefa B', energy: 3, impact: 5 });

    const energyLevel = 1;
    const [first, second] = prioritizeTasks([taskB, taskA], energyLevel, NOW);

    expect(first).toBe(taskA);
    expect(second).toBe(taskB);
  });

  it('com energia baixa fracionária (vinda do engine 0-5), prioriza a tarefa viável de menor energia', () => {
    // Cenário real: quarta-feira à noite, energia ~1.85 (energyScore 37).
    const taskA = baseTask({ id: 'taskA', randomId: 'taskA', name: 'Task A', area: 'areaA', energy: 2, impact: 2, frequency: { kind: 'daily', everyDay: true, days: [] } });
    const taskB = baseTask({ id: 'taskB', randomId: 'taskB', name: 'Task B', area: 'areaB', energy: 3, impact: 5, frequency: { kind: 'notime' } });
    const taskC = baseTask({ id: 'taskC', randomId: 'taskC', name: 'Task C', area: 'areaC', energy: 3, impact: 3, frequency: { kind: 'weekly', mode: 'days', count: 1, days: [1, 3] } });
    const taskD = baseTask({ id: 'taskD', randomId: 'taskD', name: 'Task D', area: 'areaD', energy: 3, impact: 3, frequency: { kind: 'once', date: '2026-06-11', time: '16:00' } });
    const taskE = baseTask({ id: 'taskE', randomId: 'taskE', name: 'Task E', area: 'areaE', energy: 4, impact: 5, frequency: { kind: 'notime' } });
    const taskF = baseTask({ id: 'taskF', randomId: 'taskF', name: 'Task F', area: 'areaF', energy: 4, impact: 3, frequency: { kind: 'daily', everyDay: true, days: [] } });

    const energyLevel = 1.85;
    const [first, second, third, fourth, fifth, sixth] = prioritizeTasks([taskF, taskE, taskB, taskC, taskD, taskA], energyLevel, NOW);

    expect(first).toBe(taskA);
    expect(second).toBe(taskB);
    expect(third).toBe(taskC);
    expect(fourth).toBe(taskD);
    expect(fifth).toBe(taskE);
    expect(sixth).toBe(taskF);
  });

  it('com energia muito baixa (0.65), prioriza a tarefa mais viável e depois o maior impacto mais próximo da faixa', () => {
    const leitura = baseTask({ id: 'leitura', randomId: 'leitura', name: 'Leitura de 10 páginas', area: 'studies', energy: 2, impact: 2, frequency: { kind: 'daily', everyDay: true, days: [] } });
    const bike = baseTask({ id: 'bike', randomId: 'bike', name: 'Fazer 40 min de bike', area: 'health', energy: 4, impact: 3, frequency: { kind: 'daily', everyDay: false, days: [1, 2, 3, 4, 5] } });
    const jiuJitsu = baseTask({ id: 'jiujitsu', randomId: 'jiujitsu', name: 'Jiu Jitsu', area: 'health', energy: 3, impact: 3, frequency: { kind: 'weekly', mode: 'days', count: 1, days: [1, 3] } });
    const pegarMae = baseTask({ id: 'mae', randomId: 'mae', name: 'Pegar a mãe', area: 'relationships', energy: 3, impact: 3, frequency: { kind: 'once', date: '2026-06-11', time: '16:00' } });
    const montarTela = baseTask({ id: 'tela', randomId: 'tela', name: 'Montar tela de configuração no Flowly', area: 'work', energy: 3, impact: 5, frequency: { kind: 'notime' } });
    const anamnese = baseTask({ id: 'anamnese', randomId: 'anamnese', name: 'Fazer anamnese do flowly', area: 'work', energy: 4, impact: 5, frequency: { kind: 'notime' } });
    const pagamento = baseTask({ id: 'pagamento', randomId: 'pagamento', name: 'Colocar sistema de pagamento no flowly', area: 'work', energy: 4, impact: 5, frequency: { kind: 'notime' } });
    const publicacao = baseTask({ id: 'publicacao', randomId: 'publicacao', name: 'Fazer publicação do Flowly', area: 'work', energy: 4, impact: 5, frequency: { kind: 'notime' } });

    const energyLevel = 0.65;
    const [first, second] = prioritizeTasks([leitura, bike, jiuJitsu, pegarMae, montarTela, anamnese, pagamento, publicacao], energyLevel, NOW);

    expect(first).toBe(leitura);
    expect(second).toBe(montarTela);
  });

  it('tarefa pontual sobe na prioridade conforme o horário se aproxima', () => {
    // NOW é quarta 12:00; "proxima" vence em 20h, "distante" em 44h (mesma semana).
    const proxima = baseTask({ id: 'proxima', randomId: 'proxima', name: 'Compromisso próximo', energy: 2, impact: 3, frequency: { kind: 'once', date: '2026-06-11', time: '08:00' } });
    const distante = baseTask({ id: 'distante', randomId: 'distante', name: 'Compromisso distante', energy: 2, impact: 3, frequency: { kind: 'once', date: '2026-06-12', time: '08:00' } });

    const energyLevel = 2;
    const [first, second] = prioritizeTasks([distante, proxima], energyLevel, NOW);

    expect(first).toBe(proxima);
    expect(second).toBe(distante);
  });
});
