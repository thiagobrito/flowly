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
});
