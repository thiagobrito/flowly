import type { Task } from '../NewTask/data';
import { sortTasksBySchedule, taskStartMinutes } from './sortBySchedule';

const TODAY_KEY = '2026-08-05';

function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    randomId: 'random-1',
    name: 'Tarefa',
    goal: { id: 'goal-1', name: 'Meta' },
    area: 'work',
    energy: 3,
    impact: 3,
    frequency: { kind: 'notime' },
    ...overrides,
  };
}

describe('sortTasksBySchedule', () => {
  it('não inventa horário quando once.time está vazio', () => {
    expect(taskStartMinutes(baseTask({ frequency: { kind: 'once', date: TODAY_KEY, time: null } }), TODAY_KEY)).toBeNull();
  });

  it('ordena por horário e, sem horário, por menor energia e maior impacto', () => {
    const tarde = baseTask({ id: 'tarde', frequency: { kind: 'once', date: TODAY_KEY, time: '18:00' }, energy: 1, impact: 5 });
    const manha = baseTask({ id: 'manha', frequency: { kind: 'once', date: TODAY_KEY, time: '09:00' }, energy: 5, impact: 1 });
    const impacto = baseTask({ id: 'impacto', frequency: { kind: 'daily', everyDay: true, days: [] }, energy: 1, impact: 5 });
    const leve = baseTask({ id: 'leve', frequency: { kind: 'daily', everyDay: true, days: [] }, energy: 1, impact: 2 });
    const pesada = baseTask({ id: 'pesada', frequency: { kind: 'daily', everyDay: true, days: [] }, energy: 5, impact: 5 });

    expect(sortTasksBySchedule([tarde, pesada, impacto, manha, leve], TODAY_KEY).map((task) => task.id)).toEqual(['manha', 'tarde', 'impacto', 'leve', 'pesada']);
  });
});
