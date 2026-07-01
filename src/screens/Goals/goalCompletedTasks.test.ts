import type { Task } from '../NewTask/data';
import type { Goal } from './data';
import { aggregateCompletedTasks, computeTaskCompletionScore, getGoalMatchKeys, GOAL_COMPLETED_TASKS_PAGE_SIZE, paginateRows, taskBelongsToGoal } from './goalCompletedTasks';

const goal: Goal = {
  id: 'goal-flowly',
  name: 'Lançar o Flowly',
  label: 'Lançar o Flowly',
  areaId: 'FLOWLY',
  type: 'secondary',
  status: 'active',
  rpm: { result: '', purpose: '', impact: '' },
  points: 0,
  progress: 0,
  daysRemaining: 0,
  weeksCompleted: 0,
  totalWeeks: 12,
  metrics: [],
  consistencyScore: 0,
  weeklyStreak: 0,
  trend: 'stable',
  confidence: 5,
  health: [],
};

function makeTask(overrides: Partial<Task> & Pick<Task, 'name' | 'area'>): Task {
  return {
    id: overrides.id ?? Math.random().toString(),
    randomId: 'r1',
    goal: { id: goal.id, name: goal.name },
    frequency: { kind: 'notime' },
    energy: 3,
    impact: 2,
    completed: [],
    ...overrides,
  };
}

describe('taskBelongsToGoal', () => {
  it('associa tarefa pelo nome da meta vinculada (case insensitive)', () => {
    expect(taskBelongsToGoal({ goal: { id: 'g1', name: 'flowly' } }, goal)).toBe(true);
    expect(taskBelongsToGoal({ goal: { id: 'g2', name: 'health' } }, goal)).toBe(false);
  });
});

describe('getGoalMatchKeys', () => {
  it('inclui areaId, label da área e nome da meta', () => {
    const keys = getGoalMatchKeys(goal);
    expect(keys).toContain('flowly');
    expect(keys).toContain('lançar o flowly');
  });
});

describe('computeTaskCompletionScore', () => {
  it('soma energia e impacto', () => {
    expect(computeTaskCompletionScore({ energy: 4, impact: 3 })).toBe(7);
  });
});

describe('aggregateCompletedTasks', () => {
  it('agrupa tarefas com o mesmo nome e soma repetições', () => {
    const tasks = [
      makeTask({ id: '1', name: 'Deploy', area: 'FLOWLY', completed: ['2026-06-01T10:00:00.000Z'] }),
      makeTask({ id: '2', name: 'Deploy', area: 'FLOWLY', completed: ['2026-06-02T10:00:00.000Z', '2026-06-03T10:00:00.000Z'] }),
      makeTask({ id: '3', name: 'Revisar PR', area: 'FLOWLY', completed: ['2026-06-04T10:00:00.000Z'] }),
    ];

    const rows = aggregateCompletedTasks(tasks);

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.name === 'Deploy')).toMatchObject({ timesDone: 3, points: 15 });
    expect(rows.find((row) => row.name === 'Revisar PR')).toMatchObject({ timesDone: 1, points: 5 });
    expect(rows[0]?.name).toBe('Deploy');
    expect(rows[1]?.name).toBe('Revisar PR');
  });

  it('ordena tarefas repetidas primeiro, das mais executadas para as menos', () => {
    const tasks = [
      makeTask({ id: '1', name: 'Única', area: 'FLOWLY', completed: ['2026-06-10T10:00:00.000Z'] }),
      makeTask({ id: '2', name: 'Frequente', area: 'FLOWLY', completed: ['2026-06-01T10:00:00.000Z', '2026-06-02T10:00:00.000Z', '2026-06-03T10:00:00.000Z', '2026-06-04T10:00:00.000Z'] }),
      makeTask({ id: '3', name: 'Moderada', area: 'FLOWLY', completed: ['2026-06-05T10:00:00.000Z', '2026-06-06T10:00:00.000Z'] }),
    ];

    const rows = aggregateCompletedTasks(tasks);

    expect(rows.map((row) => row.name)).toEqual(['Frequente', 'Moderada', 'Única']);
  });

  it('ignora tarefas sem conclusões', () => {
    const rows = aggregateCompletedTasks([makeTask({ name: 'Vazia', area: 'FLOWLY', completed: [] })]);
    expect(rows).toHaveLength(0);
  });
});

describe('paginateRows', () => {
  it(`limita a ${GOAL_COMPLETED_TASKS_PAGE_SIZE} itens por página`, () => {
    const rows = Array.from({ length: 25 }, (_, index) => index);
    const first = paginateRows(rows, 0);
    const second = paginateRows(rows, 1);

    expect(first.pageRows).toHaveLength(GOAL_COMPLETED_TASKS_PAGE_SIZE);
    expect(second.pageRows).toHaveLength(GOAL_COMPLETED_TASKS_PAGE_SIZE);
    expect(first.totalPages).toBe(Math.ceil(25 / GOAL_COMPLETED_TASKS_PAGE_SIZE));
    expect(second.safePage).toBe(1);
  });
});
