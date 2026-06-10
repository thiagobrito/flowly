import { defaultFlowlyConfig } from './flowlyConfig';
import { computeRecoveryScore, normalizeHrv, normalizeRestingHeartRate, normalizeSleepQuality } from './recovery';

describe('normalizeSleepQuality', () => {
  it('is linear up to the sleep need', () => {
    expect(normalizeSleepQuality(8, 8)).toBe(100);
    expect(normalizeSleepQuality(6, 8)).toBe(75);
    expect(normalizeSleepQuality(4, 8)).toBe(50);
    expect(normalizeSleepQuality(0, 8)).toBe(0);
  });

  it('mildly penalizes oversleeping', () => {
    expect(normalizeSleepQuality(10, 8)).toBe(90);
    expect(normalizeSleepQuality(10, 8)).toBeLessThan(normalizeSleepQuality(8, 8));
  });
});

describe('normalizeHrv', () => {
  it('maps the floor and ceiling to 0 and 100', () => {
    expect(normalizeHrv(20)).toBe(0);
    expect(normalizeHrv(100)).toBe(100);
  });

  it('uses a log scale between floor and ceiling', () => {
    // Geometric mean of 20 and 100 (~44.7 ms) maps to exactly 50.
    expect(normalizeHrv(Math.sqrt(20 * 100))).toBeCloseTo(50, 5);
  });

  it('clamps out-of-range and invalid values', () => {
    expect(normalizeHrv(10)).toBe(0);
    expect(normalizeHrv(250)).toBe(100);
    expect(normalizeHrv(0)).toBe(0);
  });
});

describe('normalizeRestingHeartRate', () => {
  it('maps best and worst resting heart rates to 100 and 0', () => {
    expect(normalizeRestingHeartRate(45)).toBe(100);
    expect(normalizeRestingHeartRate(85)).toBe(0);
    expect(normalizeRestingHeartRate(65)).toBe(50);
  });

  it('clamps values outside the range', () => {
    expect(normalizeRestingHeartRate(40)).toBe(100);
    expect(normalizeRestingHeartRate(100)).toBe(0);
  });
});

describe('computeRecoveryScore', () => {
  it('combines all signals with the 40/30/20/10 weighting', () => {
    const score = computeRecoveryScore(
      {
        lastNightSleepHours: 8, // quality 100
        sleepDebtScore: 100,
        hrvMs: 100, // 100
        restingHeartRate: 45, // 100
      },
      8,
    );
    expect(score).toBe(100);
  });

  it('matches the weighted average for mixed signals', () => {
    const score = computeRecoveryScore(
      {
        lastNightSleepHours: 6, // quality 75
        sleepDebtScore: 50,
        hrvMs: Math.sqrt(20 * 100), // 50
        restingHeartRate: 65, // 50
      },
      8,
    );
    // 0.4*75 + 0.3*50 + 0.2*50 + 0.1*50 = 60
    expect(score).toBeCloseTo(60, 5);
  });

  it('re-normalizes the weights when HRV and RHR are missing', () => {
    const score = computeRecoveryScore(
      {
        lastNightSleepHours: 8, // quality 100
        sleepDebtScore: 30,
        hrvMs: null,
        restingHeartRate: null,
      },
      8,
    );
    // (0.4*100 + 0.3*30) / 0.7 = 70
    expect(score).toBeCloseTo(70, 5);
  });

  it('returns the neutral score when no signal is available', () => {
    const score = computeRecoveryScore(
      {
        lastNightSleepHours: null,
        sleepDebtScore: null,
        hrvMs: null,
        restingHeartRate: null,
      },
      8,
    );
    expect(score).toBe(defaultFlowlyConfig.recovery.neutralScore);
  });
});
