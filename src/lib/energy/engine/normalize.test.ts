import { clamp, hourOfDay, hoursBetween, linear, triangular } from './normalize';

describe('normalize helpers', () => {
  it('clamps values to the requested range', () => {
    expect(clamp(150)).toBe(100);
    expect(clamp(-10)).toBe(0);
    expect(clamp(42)).toBe(42);
  });

  it('maps values linearly between worst and best', () => {
    expect(linear(50, 0, 100)).toBe(50);
    expect(linear(10, 10, 10)).toBe(0);
  });

  it('scores triangular responses around an ideal value', () => {
    expect(triangular(10, 10, 2)).toBe(100);
    expect(triangular(12, 10, 2)).toBe(0);
    expect(triangular(10, 10, 0)).toBe(100);
    expect(triangular(11, 10, 0)).toBe(0);
  });

  it('derives hour-of-day and hour deltas from ISO timestamps', () => {
    const iso = '2026-06-09T03:30:00.000Z';
    const local = new Date(iso);

    expect(hourOfDay(iso)).toBeCloseTo(local.getHours() + local.getMinutes() / 60 + local.getSeconds() / 3600, 5);
    expect(hoursBetween('2026-06-09T10:00:00.000Z', '2026-06-09T12:30:00.000Z')).toBe(2.5);
  });
});
