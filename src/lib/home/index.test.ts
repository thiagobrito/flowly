import type { Task } from '@/screens/NewTask/data';

import { fetchHome } from './index';

jest.mock('@/lib/network', () => ({
  api: { get: jest.fn() },
}));

const { api } = jest.requireMock('@/lib/network') as { api: { get: jest.Mock } };

function task(overrides: Partial<Task> & { id: string }): Task {
  return {
    randomId: overrides.id,
    name: 'Tarefa',
    goal: { id: 'g', name: 'work' },
    area: 'work',
    frequency: { kind: 'notime' },
    ...overrides,
  };
}

describe('fetchHome', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('tira once de dia passado de Hoje quando o servidor omite overdue', async () => {
    const overdueOnce = task({
      id: 'cafe-16',
      name: 'Café da manhã — 3 ovos + verduras',
      frequency: { kind: 'once', date: '2026-08-16', time: '08:30' },
    });
    const todayOnce = task({
      id: 'debrief-18',
      name: 'Debrief — Weiyu Jin IC5',
      frequency: { kind: 'once', date: '2026-08-18', time: '15:00' },
    });
    const nodate = task({ id: 'inbox', name: 'Problemas do flowly', frequency: { kind: 'notime' } });

    api.get.mockResolvedValue({
      success: true,
      today: { visible: [0, 1, 2], concluded: [] },
      week: { byDate: {}, tomorrowKey: '2026-08-19' },
      nodate: [],
      tasks: [overdueOnce, todayOnce, nodate],
    });

    const data = await fetchHome('2026-08-18T21:30:00.000-03:00', 3);

    expect(data.today.visibleTasks.map((item) => item.id)).toEqual(['debrief-18']);
    expect(data.overdueTasks.map((item) => item.id)).toEqual(['cafe-16']);
    expect(data.nodateTasks.map((item) => item.id)).toEqual(['inbox']);
  });
});
