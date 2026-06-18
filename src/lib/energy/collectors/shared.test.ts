import { average, dayKey, emptyMetrics, isSameDay, lastDaysRange, mainSleepSession, minutesBetween, sleepHistoryFromIntervals, stdDev, sum, unionMinutes } from './shared';

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

  describe('unionMinutes', () => {
    it('counts overlapping intervals only once', () => {
      // Two data sources reporting the same 8h night must not become 16h.
      const intervals = [
        { start: '2026-06-09T23:00:00.000Z', end: '2026-06-10T07:00:00.000Z' },
        { start: '2026-06-09T23:00:00.000Z', end: '2026-06-10T07:00:00.000Z' },
      ];
      expect(unionMinutes(intervals)).toBe(8 * 60);
    });

    it('merges partially overlapping intervals', () => {
      const intervals = [
        { start: '2026-06-09T23:00:00.000Z', end: '2026-06-10T03:00:00.000Z' },
        { start: '2026-06-10T02:00:00.000Z', end: '2026-06-10T07:00:00.000Z' },
      ];
      expect(unionMinutes(intervals)).toBe(8 * 60);
    });

    it('sums disjoint intervals and ignores invalid ones', () => {
      const intervals = [
        { start: '2026-06-10T00:00:00.000Z', end: '2026-06-10T01:00:00.000Z' },
        { start: '2026-06-10T05:00:00.000Z', end: '2026-06-10T05:30:00.000Z' },
        { start: '2026-06-10T09:00:00.000Z', end: '2026-06-10T09:00:00.000Z' },
      ];
      expect(unionMinutes(intervals)).toBe(90);
      expect(unionMinutes([])).toBe(0);
    });
  });

  describe('mainSleepSession', () => {
    it('keeps a daytime nap out of the main night', () => {
      const night = { start: '2026-06-09T23:00:00.000Z', end: '2026-06-10T07:00:00.000Z' };
      const nap = { start: '2026-06-10T14:00:00.000Z', end: '2026-06-10T14:30:00.000Z' };

      const main = mainSleepSession([night, nap]);

      expect(main).toEqual([night]);
      expect(unionMinutes(main)).toBe(8 * 60);
    });

    it('keeps fragmented sleep within one session', () => {
      const segments = [
        { start: '2026-06-09T23:00:00.000Z', end: '2026-06-10T02:00:00.000Z' },
        { start: '2026-06-10T03:00:00.000Z', end: '2026-06-10T07:00:00.000Z' },
      ];

      const main = mainSleepSession(segments);

      expect(main).toHaveLength(2);
      expect(unionMinutes(main)).toBe(7 * 60);
    });

    it('returns an empty array for no intervals', () => {
      expect(mainSleepSession([])).toEqual([]);
    });
  });

  it('builds per-night history from interval unions', () => {
    const intervals = [
      { start: '2026-06-08T23:00:00.000Z', end: '2026-06-09T07:00:00.000Z' },
      { start: '2026-06-08T23:00:00.000Z', end: '2026-06-09T07:00:00.000Z' },
    ];

    const history = sleepHistoryFromIntervals(intervals);

    expect(history).toHaveLength(1);
    expect(history[0]!.sleepHours).toBe(8);
  });
});
