import type { FlowlyEngineInput, SleepNight } from '../types';
import { computeEnergyAtMoment, flowlyInputFromMetrics, generateEnergyCurve } from './flowlyEngine';

// Woke at 07:00 UTC after going to bed at 23:00 UTC.
const WAKE = '2026-06-08T07:00:00.000Z';
const BED = '2026-06-07T23:00:00.000Z';

const atHoursAwake = (hours: number): string => new Date(new Date(WAKE).getTime() + hours * 3600_000).toISOString();

const nights = (hours: number[]): SleepNight[] => hours.map((sleepHours, i) => ({ date: `2026-05-${String(25 + i).padStart(2, '0')}`, sleepHours }));

const restedInput = (overrides: Partial<FlowlyEngineInput> = {}): FlowlyEngineInput => ({
  sleepNeedHours: 8,
  sleepHistory: nights([8, 8, 8, 8, 8, 8, 8]),
  lastNightSleepHours: 8,
  wakeTime: WAKE,
  bedTime: BED,
  hrvMs: 80,
  restingHeartRate: 50,
  ...overrides,
});

const deprivedInput = (): FlowlyEngineInput =>
  restedInput({
    sleepHistory: nights([5, 5, 5, 5, 5, 5, 5]),
    lastNightSleepHours: 5,
    hrvMs: 25,
    restingHeartRate: 80,
  });

describe('computeEnergyAtMoment', () => {
  it('produces a high score at the morning peak for a well-rested user', () => {
    const result = computeEnergyAtMoment(restedInput(), atHoursAwake(3));

    expect(result.energyScore).toBeGreaterThanOrEqual(67);
    expect(result.band).toBe('high');
    expect(result.components.sleepDebtHours).toBe(0);
    expect(result.components.sleepDebtScore).toBe(100);
    expect(result.components.sleepInertiaPenalty).toBe(0);
  });

  it('applies the final formula: circadian * recovery/100 - inertia, clamped', () => {
    const result = computeEnergyAtMoment(restedInput(), atHoursAwake(0.5));
    const { circadianEnergy, recoveryScore, sleepInertiaPenalty } = result.components;

    const expected = Math.round(Math.max(0, Math.min(100, circadianEnergy * (recoveryScore / 100) - sleepInertiaPenalty)));
    // Components are rounded for display, so allow a 1-point tolerance.
    expect(Math.abs(result.energyScore - expected)).toBeLessThanOrEqual(1);
    expect(sleepInertiaPenalty).toBeGreaterThan(0);
  });

  it('reduces energy during the sleep-inertia window', () => {
    const justAwake = computeEnergyAtMoment(restedInput(), atHoursAwake(0.25));
    const afterInertia = computeEnergyAtMoment(restedInput(), atHoursAwake(3));

    expect(justAwake.energyScore).toBeLessThan(afterInertia.energyScore);
    expect(justAwake.components.sleepInertiaPenalty).toBeGreaterThan(0);
    expect(afterInertia.components.sleepInertiaPenalty).toBe(0);
  });

  it('shows the afternoon dip between the two peaks', () => {
    const morningPeak = computeEnergyAtMoment(restedInput(), atHoursAwake(3)).energyScore;
    const dip = computeEnergyAtMoment(restedInput(), atHoursAwake(7)).energyScore;
    const secondPeak = computeEnergyAtMoment(restedInput(), atHoursAwake(9.5)).energyScore;

    expect(dip).toBeLessThan(morningPeak);
    expect(dip).toBeLessThan(secondPeak);
    expect(secondPeak).toBeLessThan(morningPeak);
  });

  it('declines toward bedtime', () => {
    const evening = computeEnergyAtMoment(restedInput(), atHoursAwake(14)).energyScore;
    const nearBed = computeEnergyAtMoment(restedInput(), atHoursAwake(16)).energyScore;

    expect(nearBed).toBeLessThan(evening);
    expect(nearBed).toBeLessThan(40);
  });

  it('scores a sleep-deprived user well below a rested one', () => {
    const moment = atHoursAwake(3);
    const rested = computeEnergyAtMoment(restedInput(), moment);
    const deprived = computeEnergyAtMoment(deprivedInput(), moment);

    expect(deprived.energyScore).toBeLessThan(rested.energyScore - 20);
    expect(deprived.components.sleepDebtHours).toBe(21);
    expect(deprived.components.sleepDebtScore).toBe(0);
    expect(deprived.band).toBe('low');
  });

  it('always stays within 0-100 across the whole day', () => {
    for (let t = 0; t <= 20; t += 0.5) {
      const { energyScore } = computeEnergyAtMoment(deprivedInput(), atHoursAwake(t));
      expect(energyScore).toBeGreaterThanOrEqual(0);
      expect(energyScore).toBeLessThanOrEqual(100);
    }
  });

  it('exposes the 0-5 energy level for the task engine', () => {
    const result = computeEnergyAtMoment(restedInput(), atHoursAwake(3));
    expect(result.energyLevel).toBeCloseTo(result.energyScore / 20, 5);
  });

  it('handles missing data gracefully', () => {
    const result = computeEnergyAtMoment(
      {
        sleepHistory: [],
        lastNightSleepHours: null,
        wakeTime: null,
        bedTime: null,
        hrvMs: null,
        restingHeartRate: null,
      },
      '2026-06-08T15:00:00.000Z',
    );

    expect(result.energyScore).toBeGreaterThanOrEqual(0);
    expect(result.energyScore).toBeLessThanOrEqual(100);
    expect(result.components.recoveryScore).toBe(50); // neutral
  });
});

describe('generateEnergyCurve', () => {
  it('samples the day from wake-up to bedtime', () => {
    const curve = generateEnergyCurve(restedInput(), undefined, { stepMinutes: 30 });

    expect(curve[0]!.time).toBe(WAKE);
    expect(curve[0]!.hoursAwake).toBe(0);
    // 16h day sampled every 30 min -> 33 points.
    expect(curve).toHaveLength(33);
    expect(curve[curve.length - 1]!.hoursAwake).toBe(16);
  });

  it('keeps every sample within 0-100 and matches the moment computation', () => {
    const curve = generateEnergyCurve(restedInput());
    curve.forEach((point) => {
      expect(point.energyScore).toBeGreaterThanOrEqual(0);
      expect(point.energyScore).toBeLessThanOrEqual(100);
      expect(point.energyScore).toBe(computeEnergyAtMoment(restedInput(), point.time).energyScore);
    });
  });

  it('places the daily maximum at the morning peak window (2-4h awake)', () => {
    const curve = generateEnergyCurve(restedInput());
    const best = curve.reduce((max, point) => (point.energyScore > max.energyScore ? point : max), curve[0]!);

    expect(best.hoursAwake).toBeGreaterThanOrEqual(2);
    expect(best.hoursAwake).toBeLessThanOrEqual(4);
  });
});

describe('flowlyInputFromMetrics', () => {
  it('adapts collector metrics to the engine input', () => {
    const input = flowlyInputFromMetrics(
      {
        sleepHours: 7.5,
        wakeTime: WAKE,
        bedTime: BED,
        sleepHistory: nights([7, 8]),
        now: atHoursAwake(4),
        workoutToday: false,
        workoutMinutesToday: null,
        hrvMs: 60,
        restingHeartRate: 55,
        deepSleepMin: null,
        remSleepMin: null,
        sleepVariability: null,
        trainingLoad7d: null,
      },
      7.5,
    );

    expect(input).toEqual({
      sleepNeedHours: 7.5,
      sleepHistory: nights([7, 8]),
      lastNightSleepHours: 7.5,
      wakeTime: WAKE,
      bedTime: BED,
      hrvMs: 60,
      restingHeartRate: 55,
    });
  });
});
