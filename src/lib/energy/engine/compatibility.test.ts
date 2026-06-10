import { computeTaskCompatibility, energyScoreToLevel } from './compatibility';

describe('energyScoreToLevel', () => {
  it('maps the 0-100 score onto the 0-5 scale', () => {
    expect(energyScoreToLevel(0)).toBe(0);
    expect(energyScoreToLevel(50)).toBe(2.5);
    expect(energyScoreToLevel(100)).toBe(5);
  });

  it('clamps out-of-range scores', () => {
    expect(energyScoreToLevel(-10)).toBe(0);
    expect(energyScoreToLevel(140)).toBe(5);
  });
});

describe('computeTaskCompatibility', () => {
  it('returns 1 for a perfect match', () => {
    expect(computeTaskCompatibility(3, 3)).toBe(1);
  });

  it('returns 0 for the maximum mismatch', () => {
    expect(computeTaskCompatibility(0, 5)).toBe(0);
    expect(computeTaskCompatibility(5, 0)).toBe(0);
  });

  it('is symmetric and linear in the energy distance', () => {
    expect(computeTaskCompatibility(4, 1.5)).toBeCloseTo(0.5, 5);
    expect(computeTaskCompatibility(1.5, 4)).toBeCloseTo(0.5, 5);
    expect(computeTaskCompatibility(2, 3)).toBeCloseTo(0.8, 5);
  });

  it('clamps inputs to the 0-5 scale', () => {
    expect(computeTaskCompatibility(7, 5)).toBe(1);
    expect(computeTaskCompatibility(-2, 0)).toBe(1);
  });
});
