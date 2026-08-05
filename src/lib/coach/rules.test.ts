import type { Task } from '@/screens/NewTask/data';

import type { DayEnergyCurve } from './dayCurve';
import { buildRecommendations, quantizeNow } from './rules';
import { minutesOfIso } from './schedule';
import type { CoachInput } from './types';

function makeTask(overrides: Partial<Task> & { id: string; name: string }): Task {
  return {
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

function curveWithPeak(): DayEnergyCurve {
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    iso: `2026-08-04T${String(hour).padStart(2, '0')}:00:00.000-03:00`,
    score: scoreForHour(hour),
    asleep: hour < 7 || hour >= 23,
  }));
  return {
    dateKey: '2026-08-04',
    hasProfile: true,
    hours,
    peakWindow: { startHour: 9, endHour: 12 },
    peak: null,
  };
}

describe('buildRecommendations', () => {
  it('sugere agendar alto impacto sem horário', () => {
    const input: CoachInput = {
      dateKey: '2026-08-04',
      now: new Date('2026-08-04T08:00:00-03:00'),
      tasks: [makeTask({ id: '1', name: 'Deep work', impact: 5, energy: 4 })],
      concluded: [],
      curve: curveWithPeak(),
      lastNightSleepHours: 8,
    };

    const insights = buildRecommendations(input);
    expect(insights.some((item) => item.id.startsWith('unscheduled-'))).toBe(true);
    expect(insights[0]?.action?.type).toBe('schedule');
  });

  it('sugere deferir deep work quando dormiu menos de 6h', () => {
    const input: CoachInput = {
      dateKey: '2026-08-04',
      now: new Date('2026-08-04T08:00:00-03:00'),
      tasks: [
        makeTask({
          id: '1',
          name: 'Deep work',
          impact: 5,
          energy: 5,
          schedule: [{ dateTime: '2026-08-04T10:00:00.000-03:00', duration: 60 }],
        }),
      ],
      concluded: [],
      curve: curveWithPeak(),
      lastNightSleepHours: 4.5,
    };

    const insights = buildRecommendations(input);
    expect(insights.some((item) => item.id.startsWith('defer-'))).toBe(true);
  });

  // A queixa central da feature era "as sugestões variam sempre que aparecem".
  // `input.tasks` chega na ordem do FlowScore do servidor, que muda a cada
  // mudança de nível de energia; se a ordem da lista seguir a de entrada, o
  // usuário vê três sugestões diferentes sem que nada tenha mudado no dia.
  it('não depende da ordem de entrada das tarefas', () => {
    const tasks = [makeTask({ id: 'a', name: 'A', impact: 5, energy: 3 }), makeTask({ id: 'b', name: 'B', impact: 4, energy: 3 }), makeTask({ id: 'c', name: 'C', impact: 5, energy: 3 }), makeTask({ id: 'd', name: 'D', impact: 4, energy: 3 })];

    const build = (ordered: Task[]) =>
      buildRecommendations({
        dateKey: '2026-08-04',
        now: new Date('2026-08-04T08:00:00-03:00'),
        tasks: ordered,
        concluded: [],
        curve: curveWithPeak(),
        lastNightSleepHours: 8,
      });

    const baseline = build(tasks);
    expect(baseline.length).toBeGreaterThan(0);

    for (const permutation of [[...tasks].reverse(), [tasks[3]!, tasks[0]!, tasks[2]!, tasks[1]!], [tasks[1]!, tasks[3]!, tasks[0]!, tasks[2]!]]) {
      expect(build(permutation)).toEqual(baseline);
    }
  });

  it('prioriza dívida de sono sobre vale e agendamento', () => {
    const insights = buildRecommendations({
      dateKey: '2026-08-04',
      now: new Date('2026-08-04T08:00:00-03:00'),
      tasks: [makeTask({ id: 'deep', name: 'Deep work', impact: 5, energy: 5, schedule: [{ dateTime: '2026-08-04T14:00:00.000-03:00', duration: 60 }] }), makeTask({ id: 'sem-hora', name: 'Sem hora', impact: 5, energy: 2 })],
      concluded: [],
      curve: curveWithPeak(),
      lastNightSleepHours: 4,
    });

    expect(insights[0]!.id).toBe('defer-deep');
  });

  it('não sugere para amanhã um horário já ocupado', () => {
    const deepWork = makeTask({ id: 'deep', name: 'Deep work', impact: 5, energy: 5, estimatedMinutes: 60, schedule: [{ dateTime: '2026-08-04T14:00:00.000-03:00', duration: 60 }] });

    // Amanhã tem o pico (09:00–12:00) inteiro ocupado. A sugestão deve cair
    // fora dessa faixa em vez de colidir.
    const busyPeak = makeTask({ id: 'reuniao', name: 'Reunião', impact: 3, energy: 2, estimatedMinutes: 180, schedule: [{ dateTime: '2026-08-05T09:00:00.000-03:00', duration: 180 }] });

    const [insight] = buildRecommendations({
      dateKey: '2026-08-04',
      now: new Date('2026-08-04T08:00:00-03:00'),
      tasks: [deepWork],
      concluded: [],
      curve: curveWithPeak(),
      lastNightSleepHours: 4,
      tomorrowTasks: [busyPeak],
    });

    expect(insight!.id).toBe('defer-deep');
    const startMinute = minutesOfIso(insight!.action!.startISO)!;
    const busyStart = 9 * 60;
    const busyEnd = 12 * 60;
    expect(startMinute >= busyEnd || startMinute + insight!.action!.durationMin <= busyStart).toBe(true);
  });

  it('omite a sugestão de dívida de sono quando amanhã não tem espaço', () => {
    const deepWork = makeTask({ id: 'deep', name: 'Deep work', impact: 5, energy: 5, estimatedMinutes: 60, schedule: [{ dateTime: '2026-08-04T14:00:00.000-03:00', duration: 60 }] });
    const fullDay = makeTask({ id: 'lotado', name: 'Dia lotado', impact: 3, energy: 2, estimatedMinutes: 960, schedule: [{ dateTime: '2026-08-05T07:00:00.000-03:00', duration: 960 }] });

    const insights = buildRecommendations({
      dateKey: '2026-08-04',
      now: new Date('2026-08-04T08:00:00-03:00'),
      tasks: [deepWork],
      concluded: [],
      curve: curveWithPeak(),
      lastNightSleepHours: 4,
      tomorrowTasks: [fullDay],
    });

    expect(insights.some((item) => item.id.startsWith('defer-'))).toBe(false);
  });

  it('devolve no máximo três sugestões', () => {
    const insights = buildRecommendations({
      dateKey: '2026-08-04',
      now: new Date('2026-08-04T08:00:00-03:00'),
      tasks: Array.from({ length: 8 }, (_, index) => makeTask({ id: `t${index}`, name: `T${index}`, impact: 5, energy: 3 })),
      concluded: [],
      curve: curveWithPeak(),
      lastNightSleepHours: 8,
    });

    expect(insights).toHaveLength(3);
  });

  it('não repete o mesmo horário em duas sugestões', () => {
    const insights = buildRecommendations({
      dateKey: '2026-08-04',
      now: new Date('2026-08-04T08:00:00-03:00'),
      tasks: Array.from({ length: 3 }, (_, index) => makeTask({ id: `t${index}`, name: `T${index}`, impact: 5, energy: 3, estimatedMinutes: 60 })),
      concluded: [],
      curve: curveWithPeak(),
      lastNightSleepHours: 8,
    });

    const starts = insights.map((insight) => insight.action!.startISO);
    expect(new Set(starts).size).toBe(starts.length);
  });
});

describe('quantizeNow', () => {
  it('arredonda para baixo no slot de 15 minutos', () => {
    expect(quantizeNow(new Date('2026-08-04T10:07:42.500-03:00')).toISOString()).toBe(new Date('2026-08-04T10:00:00.000-03:00').toISOString());
    expect(quantizeNow(new Date('2026-08-04T10:29:59.999-03:00')).toISOString()).toBe(new Date('2026-08-04T10:15:00.000-03:00').toISOString());
    expect(quantizeNow(new Date('2026-08-04T10:45:00.000-03:00')).toISOString()).toBe(new Date('2026-08-04T10:45:00.000-03:00').toISOString());
  });

  it('colapsa todo o slot num único valor, estabilizando o memo', () => {
    const slot = new Set([0, 1, 7, 14].map((minute) => quantizeNow(new Date(`2026-08-04T10:${String(minute).padStart(2, '0')}:00-03:00`)).getTime()));

    expect(slot.size).toBe(1);
  });
});
