import type { FlowlyEngineInput } from '@/lib/energy';

import { buildMobileDayCurve } from './dayCurve';

// Acordou 07:00 e dormiu 23:00 no horário de São Paulo (-03:00).
const WAKE = '2026-08-04T10:00:00.000Z';
const BED = '2026-08-04T02:00:00.000Z';

const input = (overrides: Partial<FlowlyEngineInput> = {}): FlowlyEngineInput => ({
  sleepNeedHours: 8,
  sleepHistory: [
    { date: '2026-08-02', sleepHours: 8 },
    { date: '2026-08-03', sleepHours: 8 },
    { date: '2026-08-04', sleepHours: 8 },
  ],
  lastNightSleepHours: 8,
  wakeTime: WAKE,
  bedTime: BED,
  hrvMs: 70,
  restingHeartRate: 55,
  ...overrides,
});

describe('buildMobileDayCurve', () => {
  it('devolve 24 horas para o dia pedido', () => {
    const curve = buildMobileDayCurve(input(), '2026-08-04');

    expect(curve.dateKey).toBe('2026-08-04');
    expect(curve.hours).toHaveLength(24);
    expect(curve.hours.map((hour) => hour.hour)).toEqual(Array.from({ length: 24 }, (_, index) => index));
  });

  it('marca hasProfile falso sem wake/bed', () => {
    expect(buildMobileDayCurve(input({ wakeTime: null }), '2026-08-04').hasProfile).toBe(false);
    expect(buildMobileDayCurve(input({ bedTime: null }), '2026-08-04').hasProfile).toBe(false);
  });

  it('devolve curva vazia sem input, em vez de lançar', () => {
    const curve = buildMobileDayCurve(null, '2026-08-04');

    expect(curve).toEqual({ dateKey: '2026-08-04', hasProfile: false, hours: [], peakWindow: null, peak: null });
  });

  // A janela de sono atravessa a meia-noite (23:00 → 07:00): se `isAsleep`
  // comparasse só timestamps na ordem errada, o app inteiro consideraria o
  // usuário acordado de madrugada e sugeriria blocos às 3h.
  it('marca como sono as horas antes de acordar e depois de deitar', () => {
    const curve = buildMobileDayCurve(input(), '2026-08-04');
    const asleepAt = (hour: number) => curve.hours[hour]!.asleep;

    expect(asleepAt(3)).toBe(true);
    expect(asleepAt(6)).toBe(true);
    expect(asleepAt(7)).toBe(false);
    expect(asleepAt(12)).toBe(false);
    expect(asleepAt(22)).toBe(false);
    expect(asleepAt(23)).toBe(true);
  });

  it('não marca sono quando não há perfil', () => {
    const curve = buildMobileDayCurve(input({ wakeTime: null }), '2026-08-04');

    expect(curve.hours.every((hour) => !hour.asleep)).toBe(true);
  });

  it('mantém os scores na faixa 0–100', () => {
    for (const hour of buildMobileDayCurve(input(), '2026-08-04').hours) {
      expect(hour.score).toBeGreaterThanOrEqual(0);
      expect(hour.score).toBeLessThanOrEqual(100);
    }
  });

  it('deriva peakWindow dentro do dia, com endHour 24 na virada', () => {
    const { peakWindow } = buildMobileDayCurve(input(), '2026-08-04');

    expect(peakWindow).not.toBeNull();
    expect(peakWindow!.startHour).toBeGreaterThanOrEqual(0);
    expect(peakWindow!.startHour).toBeLessThan(24);
    // `endHour || 24`: meia-noite vira 24 para o intervalo não ficar invertido.
    expect(peakWindow!.endHour).toBeGreaterThan(0);
    expect(peakWindow!.endHour).toBeLessThanOrEqual(24);
  });

  // Regressão do bug de ancoragem: dias diferentes precisam de curvas diferentes,
  // senão o coach planeja amanhã com a energia de hoje.
  it('ancora a curva no dia pedido', () => {
    const today = buildMobileDayCurve(input(), '2026-08-04');
    const yesterday = buildMobileDayCurve(input({ sleepHistory: [{ date: '2026-08-03', sleepHours: 3 }] }), '2026-08-03');

    expect(yesterday.dateKey).toBe('2026-08-03');
    expect(new Date(yesterday.hours[10]!.iso).getDate()).toBe(3);
    expect(new Date(today.hours[10]!.iso).getDate()).toBe(4);
  });
});
