import type { Task } from '../NewTask/data';
import FilterTasksToShow from './filter';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    randomId: 'random-1',
    name: 'Task',
    area: 'health',
    frequency: { kind: 'daily', everyDay: true, days: [] },
    completed: [],
    ...overrides,
  };
}

describe('FilterTasksToShow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-09T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows daily tasks due today and hides completed ones', () => {
    const dueTask = makeTask({ id: 'due' });
    const completedTask = makeTask({
      id: 'done',
      completed: ['2026-06-09T10:00:00.000Z'],
    });

    const result = FilterTasksToShow([dueTask, completedTask]);

    expect(result.visibleTasks).toEqual([dueTask]);
    expect(result.concludedTasks).toEqual([completedTask]);
  });

  it('keeps overdue once tasks visible until they are completed', () => {
    const overdueTask = makeTask({
      id: 'overdue',
      frequency: { kind: 'once', date: '2026-06-01', time: null },
    });

    const result = FilterTasksToShow([overdueTask]);

    expect(result.visibleTasks).toEqual([overdueTask]);
    expect(result.concludedTasks).toEqual([]);
  });

  it('respects weekly count limits', () => {
    const weeklyTask = makeTask({
      id: 'weekly',
      frequency: { kind: 'weekly', mode: 'count', count: 1, days: [] },
      completed: ['2026-06-08T10:00:00.000Z'],
    });

    const result = FilterTasksToShow([weeklyTask]);

    expect(result.visibleTasks).toEqual([]);
    expect(result.concludedTasks).toEqual([]);
  });
});
