import type { Task } from '../NewTask/data';
import { getTaskDateKeys, getWeekDateKeys, taskMatchesDateFilter } from './taskDateFilter';

const REFERENCE = new Date('2026-06-10T15:00:00.000Z'); // quarta-feira em America/Sao_Paulo

function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    randomId: 'random-1',
    name: 'Tarefa',
    goal: { id: 'goal-1', name: 'Meta' },
    area: 'work',
    frequency: { kind: 'notime' },
    ...overrides,
  };
}

describe('getWeekDateKeys', () => {
  it('retorna domingo a sábado da semana corrente', () => {
    expect(getWeekDateKeys(REFERENCE)).toEqual(['2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12', '2026-06-13']);
  });
});

describe('getTaskDateKeys', () => {
  it('inclui data de frequency once', () => {
    const task = baseTask({ frequency: { kind: 'once', date: '2026-06-11', time: '09:00' } });
    expect([...getTaskDateKeys(task)]).toEqual(['2026-06-11']);
  });

  it('inclui datas de schedule', () => {
    const task = baseTask({
      schedule: [
        { dateTime: '2026-06-10T12:00:00.000-03:00', duration: 30 },
        { dateTime: '2026-06-12T09:00:00.000-03:00', duration: 60 },
      ],
    });
    expect([...getTaskDateKeys(task)].sort()).toEqual(['2026-06-10', '2026-06-12']);
  });

  it('retorna vazio para tarefa sem datas explícitas', () => {
    expect(getTaskDateKeys(baseTask()).size).toBe(0);
  });
});

describe('taskMatchesDateFilter', () => {
  it('inclui tarefa notime não concluída em Hoje, Amanhã e Esta semana (não em Sem data)', () => {
    const task = baseTask();
    expect(taskMatchesDateFilter(task, 'today', REFERENCE)).toBe(true);
    expect(taskMatchesDateFilter(task, 'tomorrow', REFERENCE)).toBe(true);
    expect(taskMatchesDateFilter(task, 'thisWeek', REFERENCE)).toBe(true);
    expect(taskMatchesDateFilter(task, 'nodate', REFERENCE)).toBe(false);
  });

  it('move tarefa notime concluída para Sem data', () => {
    const task = baseTask({ completed: ['2026-06-10T12:00:00.000-03:00'] });
    expect(taskMatchesDateFilter(task, 'nodate', REFERENCE)).toBe(true);
    expect(taskMatchesDateFilter(task, 'today', REFERENCE)).toBe(false);
  });

  it('inclui tarefa trigger apenas em Sem data', () => {
    const task = baseTask({ frequency: { kind: 'trigger', eventId: null } });
    expect(taskMatchesDateFilter(task, 'nodate', REFERENCE)).toBe(true);
    expect(taskMatchesDateFilter(task, 'today', REFERENCE)).toBe(false);
    expect(taskMatchesDateFilter(task, 'tomorrow', REFERENCE)).toBe(false);
    expect(taskMatchesDateFilter(task, 'thisWeek', REFERENCE)).toBe(false);
  });

  it('inclui tarefa semanal por contagem (sem dias) em Hoje, Amanhã e Esta semana', () => {
    const task = baseTask({ frequency: { kind: 'weekly', mode: 'count', count: 3, days: [] } });
    expect(taskMatchesDateFilter(task, 'today', REFERENCE)).toBe(true);
    expect(taskMatchesDateFilter(task, 'tomorrow', REFERENCE)).toBe(true);
    expect(taskMatchesDateFilter(task, 'thisWeek', REFERENCE)).toBe(true);
    expect(taskMatchesDateFilter(task, 'nodate', REFERENCE)).toBe(false);
  });

  it('filtra once para Hoje e Amanhã', () => {
    const todayTask = baseTask({ frequency: { kind: 'once', date: '2026-06-10', time: null } });
    const tomorrowTask = baseTask({ frequency: { kind: 'once', date: '2026-06-11', time: null } });

    expect(taskMatchesDateFilter(todayTask, 'today', REFERENCE)).toBe(true);
    expect(taskMatchesDateFilter(todayTask, 'tomorrow', REFERENCE)).toBe(false);
    expect(taskMatchesDateFilter(tomorrowTask, 'tomorrow', REFERENCE)).toBe(true);
  });

  it('filtra schedule multi-dia para Esta semana', () => {
    // `trigger` não é "devida" por dia da semana, isolando o schedule como único
    // sinal de data (evita que a recorrência case com o dia de hoje).
    const task = baseTask({
      frequency: { kind: 'trigger', eventId: null },
      schedule: [{ dateTime: '2026-06-13T10:00:00.000-03:00', duration: 30 }],
    });

    expect(taskMatchesDateFilter(task, 'thisWeek', REFERENCE)).toBe(true);
    expect(taskMatchesDateFilter(task, 'today', REFERENCE)).toBe(false);
  });

  it('exclui data fora da semana corrente', () => {
    const task = baseTask({ frequency: { kind: 'once', date: '2026-06-20', time: null } });

    expect(taskMatchesDateFilter(task, 'thisWeek', REFERENCE)).toBe(false);
  });

  it('inclui tarefa diária (todo dia) em Hoje, Amanhã e Esta semana', () => {
    const task = baseTask({ frequency: { kind: 'daily', everyDay: true, days: [] } });

    expect(taskMatchesDateFilter(task, 'today', REFERENCE)).toBe(true);
    expect(taskMatchesDateFilter(task, 'tomorrow', REFERENCE)).toBe(true);
    expect(taskMatchesDateFilter(task, 'thisWeek', REFERENCE)).toBe(true);
    expect(taskMatchesDateFilter(task, 'nodate', REFERENCE)).toBe(false);
  });

  it('inclui tarefa diária de dias específicos apenas nos dias marcados', () => {
    // REFERENCE é quarta (3); quinta é 4.
    const task = baseTask({ frequency: { kind: 'daily', everyDay: false, days: [3] } });

    expect(taskMatchesDateFilter(task, 'today', REFERENCE)).toBe(true);
    expect(taskMatchesDateFilter(task, 'tomorrow', REFERENCE)).toBe(false);
    expect(taskMatchesDateFilter(task, 'thisWeek', REFERENCE)).toBe(true);
  });

  it('inclui tarefa semanal de quinta em Amanhã e Esta semana, mas não em Hoje', () => {
    const task = baseTask({ frequency: { kind: 'weekly', mode: 'days', count: 1, days: [4] } });

    expect(taskMatchesDateFilter(task, 'today', REFERENCE)).toBe(false);
    expect(taskMatchesDateFilter(task, 'tomorrow', REFERENCE)).toBe(true);
    expect(taskMatchesDateFilter(task, 'thisWeek', REFERENCE)).toBe(true);
  });

  it('inclui once atrasada em Hoje', () => {
    const task = baseTask({ frequency: { kind: 'once', date: '2026-06-05', time: null } });

    expect(taskMatchesDateFilter(task, 'today', REFERENCE)).toBe(true);
  });
});
