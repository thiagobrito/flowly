import { average, dayKey, emptyMetrics, isSameDay, lastDaysRange, minutesBetween, stdDev, sum } from './shared';

describe('energy collectors shared helpers', () => {
  const now = new Date('2026-06-09T12:00:00.000Z');

  it('builds a date range ending at now', () => {
    const range = lastDaysRange(7, now);

    expect(range.endDate).toBe(now.toISOString());
    expect(new Date(range.startDate).getTime()).toBe(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  });

  it('returns empty metrics with the provided timestamp', () => {
    const metrics = emptyMetrics(now);

    expect(metrics.now).toBe(now.toISOString());
    expect(metrics.sleepHours).toBeNull();
    expect(metrics.workoutToday).toBe(false);
  });

  it('computes minutes between ISO timestamps', () => {
    expect(minutesBetween('2026-06-09T10:00:00.000Z', '2026-06-09T11:30:00.000Z')).toBe(90);
  });

  it('checks same calendar day in local time', () => {
    expect(isSameDay('2026-06-09T08:00:00.000Z', now)).toBe(true);
    expect(isSameDay('2026-06-08T23:00:00.000Z', now)).toBe(false);
  });

  it('builds a local day key', () => {
    expect(dayKey('2026-06-09T08:00:00.000Z')).toBe(`${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`);
  });

  it('aggregates numeric arrays', () => {
    expect(average([2, 4, 6])).toBe(4);
    expect(average([])).toBeNull();
    expect(sum([1, 2, 3])).toBe(6);
    expect(stdDev([2, 4])).toBe(1);
    expect(stdDev([5])).toBeNull();
  });
});
