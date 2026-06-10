import type { SleepNight } from '../types';
import { computeSleepDebtHours, computeSleepDebtScore } from './sleepDebt';

const nights = (hours: number[], startDay = 1): SleepNight[] => hours.map((sleepHours, i) => ({ date: `2026-06-${String(startDay + i).padStart(2, '0')}`, sleepHours }));

describe('computeSleepDebtHours', () => {
  it('returns 0 for an empty history', () => {
    expect(computeSleepDebtHours([], 8)).toBe(0);
  });

  it('sums daily deficits against the sleep need', () => {
    // Need 8h, slept 6h for 3 nights -> 2h * 3 = 6h of debt.
    expect(computeSleepDebtHours(nights([6, 6, 6]), 8)).toBe(6);
  });

  it('ignores surplus nights (deficit is never negative)', () => {
    // 10h night does not erase the 2h deficit of the 6h night.
    expect(computeSleepDebtHours(nights([6, 10]), 8)).toBe(2);
  });

  it('only considers the most recent window of nights', () => {
    // 16 nights of 7h (1h deficit each) with a 14-day window -> 14h, not 16h.
    expect(computeSleepDebtHours(nights([...Array(16)].map(() => 7)), 8, 14)).toBe(14);
  });

  it('keeps the most recent nights regardless of input order', () => {
    const history = [...nights([4], 1), ...nights([8, 8], 2)].reverse();
    // Window of 2 keeps the two most recent (8h) nights -> no debt.
    expect(computeSleepDebtHours(history, 8, 2)).toBe(0);
  });
});

describe('computeSleepDebtScore', () => {
  it('matches the specification anchors', () => {
    expect(computeSleepDebtScore(0)).toBe(100);
    expect(computeSleepDebtScore(5)).toBe(75);
    expect(computeSleepDebtScore(10)).toBe(50);
    expect(computeSleepDebtScore(15)).toBe(25);
    expect(computeSleepDebtScore(20)).toBe(0);
  });

  it('saturates at 0 past the max debt', () => {
    expect(computeSleepDebtScore(28)).toBe(0);
  });

  it('is continuous and monotonically decreasing', () => {
    let previous = computeSleepDebtScore(0);
    for (let debt = 0.5; debt <= 25; debt += 0.5) {
      const score = computeSleepDebtScore(debt);
      expect(score).toBeLessThanOrEqual(previous);
      expect(previous - score).toBeLessThanOrEqual(2.6); // no jumps
      previous = score;
    }
  });
});
