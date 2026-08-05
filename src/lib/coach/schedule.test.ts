import type { Task } from '@/screens/NewTask/data';

import type { DayEnergyCurve } from './dayCurve';
import { awakeRange, blockDurationMinutes, blockForDay, busyIntervals, energyOfInterval, findBestSlot, formatHourLabel, isoAtDayMinutes, minutesOfIso, SLOT_MINUTES } from './schedule';

const DATE_KEY = '2026-08-04';

function makeTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    name: 'Tarefa',
    energy: 3,
    impact: 3,
    frequency: { kind: 'notime' },
    goal: { id: 'g', name: 'work' },
    completed: [],
    subtasks: [],
    ...overrides,
  } as Task;
}

function scoreForHour(hour: number): number {
  if (hour >= 9 && hour < 12) return 90;
  if (hour >= 14 && hour < 16) return 35;
  return 60;
}

/** Pico às 9–12h, vale às 14–16h, resto neutro; dorme antes das 7h e depois das 23h. */
function curve(overrides: Partial<DayEnergyCurve> = {}): DayEnergyCurve {
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    iso: isoAtDayMinutes(DATE_KEY, hour * 60),
    score: scoreForHour(hour),
    asleep: hour < 7 || hour >= 23,
  }));

  return { dateKey: DATE_KEY, hasProfile: true, hours, peakWindow: { startHour: 9, endHour: 12 }, peak: null, ...overrides };
}

describe('blockForDay', () => {
  it('encontra o bloco salvo no dia pedido', () => {
    const task = makeTask({ id: '1', schedule: [{ dateTime: `${DATE_KEY}T10:00:00.000-03:00`, duration: 45 }] });

    expect(blockForDay(task, DATE_KEY)).toEqual({ dateTime: `${DATE_KEY}T10:00:00.000-03:00`, duration: 45 });
    expect(blockForDay(task, '2026-08-05')).toBeNull();
  });

  it('deriva o bloco de uma tarefa "once" com hora', () => {
    const task = makeTask({ id: '1', frequency: { kind: 'once', date: DATE_KEY, time: '14:30' } as Task['frequency'], estimatedMinutes: 20 });

    expect(minutesOfIso(blockForDay(task, DATE_KEY)!.dateTime)).toBe(14 * 60 + 30);
  });

  it('usa 09:00 quando a tarefa "once" não tem hora', () => {
    const task = makeTask({ id: '1', frequency: { kind: 'once', date: DATE_KEY } as Task['frequency'] });

    expect(minutesOfIso(blockForDay(task, DATE_KEY)!.dateTime)).toBe(9 * 60);
  });

  it('ignora hora inválida e cai no padrão', () => {
    const task = makeTask({ id: '1', frequency: { kind: 'once', date: DATE_KEY, time: '25:99' } as Task['frequency'] });

    expect(minutesOfIso(blockForDay(task, DATE_KEY)!.dateTime)).toBe(9 * 60);
  });
});

describe('blockDurationMinutes', () => {
  it('usa 45 min como padrão', () => {
    expect(blockDurationMinutes(makeTask({ id: '1' }))).toBe(45);
  });

  it('arredonda para o slot de 15 min', () => {
    expect(blockDurationMinutes(makeTask({ id: '1', estimatedMinutes: 37 }))).toBe(30);
    expect(blockDurationMinutes(makeTask({ id: '1', estimatedMinutes: 38 }))).toBe(45);
  });

  it('nunca fica abaixo de um slot nem acima de 8h', () => {
    expect(blockDurationMinutes(makeTask({ id: '1', estimatedMinutes: 1 }))).toBe(SLOT_MINUTES);
    expect(blockDurationMinutes(makeTask({ id: '1', estimatedMinutes: 10_000 }))).toBe(8 * 60);
  });
});

describe('busyIntervals', () => {
  it('devolve os intervalos ordenados por início', () => {
    const tasks = [makeTask({ id: 'tarde', schedule: [{ dateTime: `${DATE_KEY}T15:00:00.000-03:00`, duration: 30 }] }), makeTask({ id: 'manha', schedule: [{ dateTime: `${DATE_KEY}T09:00:00.000-03:00`, duration: 60 }] })];

    expect(busyIntervals(tasks, DATE_KEY)).toEqual([
      { taskId: 'manha', start: 9 * 60, end: 10 * 60 },
      { taskId: 'tarde', start: 15 * 60, end: 15 * 60 + 30 },
    ]);
  });

  it('ignora tarefas sem bloco no dia', () => {
    expect(busyIntervals([makeTask({ id: 'sem-hora' })], DATE_KEY)).toEqual([]);
  });

  it('dá a um bloco de duração zero a largura mínima de um slot', () => {
    const [interval] = busyIntervals([makeTask({ id: '1', schedule: [{ dateTime: `${DATE_KEY}T09:00:00.000-03:00`, duration: 0 }] })], DATE_KEY);

    expect(interval!.end - interval!.start).toBe(SLOT_MINUTES);
  });
});

describe('awakeRange', () => {
  it('usa a primeira e a última hora acordada', () => {
    expect(awakeRange(curve())).toEqual({ start: 7 * 60, end: 23 * 60 });
  });

  it('cai em 08h–22h sem perfil de sono', () => {
    expect(awakeRange(curve({ hasProfile: false }))).toEqual({ start: 8 * 60, end: 22 * 60 });
  });

  it('cai no padrão quando a curva marca o dia inteiro como sono', () => {
    const allAsleep = curve();
    expect(awakeRange({ ...allAsleep, hours: allAsleep.hours.map((hour) => ({ ...hour, asleep: true })) })).toEqual({ start: 8 * 60, end: 22 * 60 });
  });
});

describe('energyOfInterval', () => {
  it('faz a média das horas cobertas', () => {
    expect(energyOfInterval(curve(), { start: 9 * 60, end: 12 * 60 })).toBe(90);
    expect(energyOfInterval(curve(), { start: 14 * 60, end: 16 * 60 })).toBe(35);
  });

  it('não conta a hora seguinte quando o bloco termina no minuto zero', () => {
    // 12:00 já é score 60; incluí-la baixaria a média de um bloco 9–12.
    expect(energyOfInterval(curve(), { start: 11 * 60, end: 12 * 60 })).toBe(90);
  });

  it('devolve 0 quando não há hora coberta', () => {
    expect(energyOfInterval(curve({ hours: [] }), { start: 600, end: 660 })).toBe(0);
  });
});

describe('findBestSlot', () => {
  it('escolhe a janela livre com mais energia', () => {
    const slot = findBestSlot({ curve: curve(), dateKey: DATE_KEY, durationMin: 60, busy: [] });

    expect(slot!.startMinute).toBe(9 * 60);
    expect(minutesOfIso(slot!.startISO)).toBe(9 * 60);
  });

  it('desempata pelo horário mais cedo', () => {
    // Curva plana: todos os slots empatam, e o primeiro deve ganhar.
    const flat = curve();
    const slot = findBestSlot({ curve: { ...flat, hours: flat.hours.map((hour) => ({ ...hour, score: 50 })) }, dateKey: DATE_KEY, durationMin: 60, busy: [] });

    expect(slot!.startMinute).toBe(7 * 60);
  });

  it('não sobrepõe blocos ocupados', () => {
    const busy = [{ start: 9 * 60, end: 12 * 60 }];
    const slot = findBestSlot({ curve: curve(), dateKey: DATE_KEY, durationMin: 60, busy });

    expect(slot!.startMinute >= 12 * 60 || slot!.startMinute + 60 <= 9 * 60).toBe(true);
  });

  it('respeita earliestMinute, arredondando para cima no slot', () => {
    const slot = findBestSlot({ curve: curve(), dateKey: DATE_KEY, durationMin: 60, busy: [], earliestMinute: 13 * 60 + 1 });

    expect(slot!.startMinute).toBeGreaterThanOrEqual(13 * 60 + SLOT_MINUTES);
    expect(slot!.startMinute % SLOT_MINUTES).toBe(0);
  });

  it('devolve null quando o bloco não cabe no dia acordado', () => {
    expect(findBestSlot({ curve: curve(), dateKey: DATE_KEY, durationMin: 20 * 60, busy: [] })).toBeNull();
  });

  it('devolve null quando tudo está ocupado', () => {
    expect(findBestSlot({ curve: curve(), dateKey: DATE_KEY, durationMin: 60, busy: [{ start: 0, end: 24 * 60 }] })).toBeNull();
  });
});

describe('formatHourLabel', () => {
  it('formata com dois dígitos', () => {
    expect(formatHourLabel(9 * 60)).toBe('09:00');
    expect(formatHourLabel(14 * 60 + 30)).toBe('14:30');
  });

  it('volta para 00 depois da meia-noite', () => {
    expect(formatHourLabel(24 * 60)).toBe('00:00');
  });
});
