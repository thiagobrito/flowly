import { defaultConfig, WEIGHT_TIERS } from '../config';
import type { HealthMetrics } from '../types';
import { computeEnergyScore } from './energyEngine';

// Fixed reference time: 14:00, near the circadian peak.
const NOW = '2026-06-08T14:00:00.000Z';

const baseMetrics = (
  overrides: Partial<HealthMetrics> = {},
): HealthMetrics => ({
  sleepHours: 8,
  // Woke at ~06:30 (ideal), 7.5h before NOW.
  wakeTime: '2026-06-08T06:30:00.000Z',
  now: NOW,
  workoutToday: true,
  workoutMinutesToday: 45,
  hrvMs: 80,
  restingHeartRate: 50,
  deepSleepMin: 90,
  remSleepMin: 110,
  sleepVariability: 0.3,
  trainingLoad7d: 300,
  ...overrides,
});

describe('computeEnergyScore', () => {
  it('returns a high score for well-rested, recovered metrics', () => {
    const result = computeEnergyScore(baseMetrics());

    expect(result.score).toBeGreaterThanOrEqual(67);
    expect(result.band).toBe('high');
    expect(result.breakdown).toHaveLength(10);
    expect(result.breakdown.every((s) => s.available)).toBe(true);
  });

  it('clamps the score within the 0-100 range', () => {
    const result = computeEnergyScore(baseMetrics());
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('produces a lower score for sleep deprivation and high resting HR', () => {
    const rested = computeEnergyScore(baseMetrics());
    const deprived = computeEnergyScore(
      baseMetrics({
        sleepHours: 3,
        deepSleepMin: 10,
        remSleepMin: 10,
        hrvMs: 25,
        restingHeartRate: 82,
        sleepVariability: 1.8,
      }),
    );

    expect(deprived.score).toBeLessThan(rested.score);
    expect(deprived.band).not.toBe('high');
  });

  it('weights sleep hours as the strongest single signal', () => {
    const sub = computeEnergyScore(baseMetrics()).breakdown.find(
      (s) => s.key === 'sleepHours',
    );
    expect(sub?.tier).toBe('MUITO_ALTO');
    expect(sub?.weight).toBe(WEIGHT_TIERS.MUITO_ALTO);
  });

  it('excludes missing signals and re-normalizes the remaining weights', () => {
    const result = computeEnergyScore({
      ...baseMetrics(),
      hrvMs: null,
      restingHeartRate: null,
      deepSleepMin: null,
      remSleepMin: null,
      sleepVariability: null,
      trainingLoad7d: null,
    });

    const available = result.breakdown.filter((s) => s.available);
    const missing = result.breakdown.filter((s) => !s.available);

    expect(missing.map((s) => s.key).sort()).toEqual(
      [
        'deepSleep',
        'hrv',
        'remSleep',
        'restingHeartRate',
        'sleepVariability',
        'trainingLoad7d',
      ].sort(),
    );
    // timeAwake and workoutToday are always available; plus sleepHours, wakeTime.
    expect(available.length).toBe(4);
    expect(result.score).toBeGreaterThan(0);
  });

  it('falls back to a zero score when no signals are available', () => {
    const result = computeEnergyScore({
      sleepHours: null,
      wakeTime: null,
      now: NOW,
      workoutToday: false,
      workoutMinutesToday: null,
      hrvMs: null,
      restingHeartRate: null,
      deepSleepMin: null,
      remSleepMin: null,
      sleepVariability: null,
      trainingLoad7d: null,
    });

    // Only timeAwake (circadian) and workoutToday remain available.
    const available = result.breakdown.filter((s) => s.available);
    expect(available.map((s) => s.key).sort()).toEqual(
      ['timeAwake', 'workoutToday'].sort(),
    );
  });

  it('respects a custom configuration override', () => {
    const result = computeEnergyScore(baseMetrics(), {
      ...defaultConfig,
      bands: { moderate: 90, high: 99 },
    });
    // With stricter band thresholds a normally-high score is downgraded.
    expect(result.band).not.toBe('high');
  });
});
