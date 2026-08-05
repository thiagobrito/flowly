import type { FlowlyEngineInput, SleepNight } from '@/lib/energy/types';

import { averageDayEnergy, dayInputFor, weekDateKeys } from './energy';

// Acordou 07:00 de 08/06, dormiu 23:00 de 07/06 (horário de São Paulo, -03:00).
const WAKE = '2026-06-08T10:00:00.000Z';
const BED = '2026-06-08T02:00:00.000Z';

const nights = (entries: Array<[string, number]>): SleepNight[] => entries.map(([date, sleepHours]) => ({ date, sleepHours }));

const input = (overrides: Partial<FlowlyEngineInput> = {}): FlowlyEngineInput => ({
  sleepNeedHours: 8,
  sleepHistory: nights([
    ['2026-06-04', 8],
    ['2026-06-05', 4],
    ['2026-06-06', 8],
    ['2026-06-07', 8],
    ['2026-06-08', 8],
  ]),
  lastNightSleepHours: 8,
  wakeTime: WAKE,
  bedTime: BED,
  hrvMs: 70,
  restingHeartRate: 55,
  ...overrides,
});

describe('dayInputFor', () => {
  it('preserva o horário de relógio de acordar e dormir no dia alvo', () => {
    const anchored = dayInputFor(input(), '2026-06-05');

    expect(anchored).not.toBeNull();
    // Mesmo horário de parede (07:00 local / 10:00Z), três dias antes.
    expect(anchored!.wakeTime).toBe('2026-06-05T10:00:00.000Z');
    expect(anchored!.bedTime).toBe('2026-06-05T02:00:00.000Z');
  });

  it('usa as horas dormidas da noite do próprio dia', () => {
    expect(dayInputFor(input(), '2026-06-05')!.lastNightSleepHours).toBe(4);
    expect(dayInputFor(input(), '2026-06-06')!.lastNightSleepHours).toBe(8);
  });

  it('corta o histórico no dia analisado, para a dívida não olhar o futuro', () => {
    const anchored = dayInputFor(input(), '2026-06-06');

    expect(anchored!.sleepHistory.map((night) => night.date)).toEqual(['2026-06-04', '2026-06-05', '2026-06-06']);
  });

  it('cai na média do histórico quando a noite do dia não foi registrada', () => {
    const anchored = dayInputFor(input({ sleepHistory: nights([['2026-06-04', 6]]) }), '2026-06-08');

    expect(anchored!.lastNightSleepHours).toBe(6);
  });

  it('devolve null sem wakeTime, já que não há eixo circadiano', () => {
    expect(dayInputFor(input({ wakeTime: null }), '2026-06-05')).toBeNull();
    expect(dayInputFor(null, '2026-06-05')).toBeNull();
  });
});

describe('averageDayEnergy', () => {
  // Regressão do bug original: reusar o input de hoje nos sete dias fazia a
  // revisão semanal repetir a energia de hoje sete vezes.
  it('diferencia uma noite ruim de uma noite boa', () => {
    const badNight = averageDayEnergy(dayInputFor(input(), '2026-06-05'));
    const goodNight = averageDayEnergy(dayInputFor(input(), '2026-06-08'));

    expect(badNight).toBeGreaterThan(0);
    expect(badNight).toBeLessThan(goodNight);
  });

  it('devolve 0 sem input', () => {
    expect(averageDayEnergy(null)).toBe(0);
  });

  it('fica na faixa 0–100 em todos os sete dias', () => {
    for (const dateKey of weekDateKeys(new Date(WAKE))) {
      const average = averageDayEnergy(dayInputFor(input(), dateKey));
      expect(average).toBeGreaterThanOrEqual(0);
      expect(average).toBeLessThanOrEqual(100);
    }
  });
});

describe('weekDateKeys', () => {
  it('devolve sete dias crescentes terminando na âncora', () => {
    const keys = weekDateKeys(new Date(WAKE));

    expect(keys).toHaveLength(7);
    expect(keys[6]).toBe('2026-06-08');
    expect(keys[0]).toBe('2026-06-02');
    expect([...keys].sort()).toEqual(keys);
  });

  it('atravessa a virada de mês sem quebrar', () => {
    expect(weekDateKeys(new Date('2026-07-02T15:00:00.000Z'))).toEqual(['2026-06-26', '2026-06-27', '2026-06-28', '2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02']);
  });
});
