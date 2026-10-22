import type { Task } from '../NewTask/data';
import { appendInboxTasks, buildCalendarEvents, getOnceStartISO } from './eventMapping';

const TODAY = '2026-10-22';

type InboxTask = Task & { _id?: string };

function task(overrides: Partial<InboxTask> & { frequency: Task['frequency'] }): InboxTask {
  return {
    id: 'task-1',
    randomId: 'random-1',
    name: 'Tarefa',
    goal: { id: 'goal-1', name: 'career' },
    area: 'career',
    ...overrides,
  };
}

describe('appendInboxTasks', () => {
  it('devolve a once desagendada para a lista da bandeja', () => {
    const daily = task({ id: 'meditar', name: 'Meditar 10 minutos', frequency: { kind: 'daily', everyDay: true, days: [] } });
    const unscheduled = task({
      id: '',
      _id: 'task-proposta',
      name: 'Escrever proposta comercial',
      frequency: { kind: 'notime' },
      schedule: [],
    });

    const merged = appendInboxTasks([daily], [daily, unscheduled]);

    expect(merged.map((item) => item.name)).toEqual(['Meditar 10 minutos', 'Escrever proposta comercial']);
    expect(merged[1]?.done).toBe(false);
  });

  it('não duplica tarefa que o recorte do dia já trouxe', () => {
    const daily = task({ id: 'meditar', frequency: { kind: 'daily', everyDay: true, days: [] } });

    expect(appendInboxTasks([daily], [{ ...daily, id: '', _id: 'meditar' }])).toHaveLength(1);
  });

  it('deixa de fora notime concluída e notime que ainda tem slot', () => {
    const done = task({ id: 'feita', frequency: { kind: 'notime' }, completed: ['2026-10-22T12:00:00.000Z'] });
    const slotted = task({
      id: 'agendada',
      frequency: { kind: 'notime' },
      schedule: [{ dateTime: `${TODAY}T09:00:00.000Z`, duration: 30 }],
    });

    expect(appendInboxTasks([], [done, slotted])).toEqual([]);
  });
});

describe('getOnceStartISO', () => {
  it('devolve null sem hora, com hora vazia ou inválida', () => {
    const dated = (time: string | null) => task({ frequency: { kind: 'once', date: '2026-08-16', time } });

    expect(getOnceStartISO(dated(null))).toBeNull();
    expect(getOnceStartISO(dated(''))).toBeNull();
    expect(getOnceStartISO(dated('25:99'))).toBeNull();
  });

  it('preserva 09:00 quando a hora foi escolhida', () => {
    const iso = getOnceStartISO(task({ frequency: { kind: 'once', date: '2026-08-16', time: '09:00' } }));
    const date = new Date(iso ?? '');

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(16);
    expect(date.getHours()).toBe(9);
    expect(date.getMinutes()).toBe(0);
  });
});

describe('buildCalendarEvents', () => {
  it('coloca notime sem agenda na bandeja e fora da grade', () => {
    const proposta = task({ id: 'task-proposta', name: 'Escrever proposta comercial', frequency: { kind: 'notime' }, schedule: [] });

    const { events, unscheduled } = buildCalendarEvents([proposta], new Set([TODAY]));

    expect(events).toEqual([]);
    expect(unscheduled.map((item) => item.name)).toEqual(['Escrever proposta comercial']);
  });

  it('põe a tarefa só com data no topo da lista e fora da grade', () => {
    const daily = task({ id: 'daily', name: 'Meditar', frequency: { kind: 'daily', everyDay: true, days: [] } });
    const dated = task({ id: 'dated', name: 'Buscar encomenda', frequency: { kind: 'once', date: '2026-08-16', time: null } });
    const later = task({ id: 'later', name: 'Outra sem hora', frequency: { kind: 'once', date: '2026-08-16', time: '' } });

    const { events, unscheduled } = buildCalendarEvents([daily, dated, later]);

    expect(events).toEqual([]);
    expect(unscheduled.map((item) => item.id)).toEqual(['dated', 'later', 'daily']);
  });

  it('mantém na grade a once com hora explícita', () => {
    const timed = task({ id: 'timed', name: 'Reunião', frequency: { kind: 'once', date: '2026-08-16', time: '09:00' } });

    const { events, unscheduled } = buildCalendarEvents([timed]);

    expect(events.map((event) => event.title)).toEqual(['Reunião']);
    expect(unscheduled).toEqual([]);
  });
});
