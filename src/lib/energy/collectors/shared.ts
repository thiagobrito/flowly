import type { DateRange, HealthMetrics } from '../types';

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Range covering the last `days` (default 14, the sleep-debt rolling window)
 * ending at `now`.
 */
export const lastDaysRange = (days = 14, now = new Date()): DateRange => ({
  startDate: new Date(now.getTime() - days * DAY_MS).toISOString(),
  endDate: now.toISOString(),
});

/** A fully-null metrics object (used as a graceful fallback). */
export const emptyMetrics = (now = new Date()): HealthMetrics => ({
  sleepHours: null,
  wakeTime: null,
  bedTime: null,
  sleepHistory: null,
  now: now.toISOString(),
  workoutToday: false,
  workoutMinutesToday: null,
  hrvMs: null,
  restingHeartRate: null,
  deepSleepMin: null,
  remSleepMin: null,
  sleepVariability: null,
  trainingLoad7d: null,
});

/** Minutes elapsed between two ISO timestamps. */
export const minutesBetween = (startIso: string, endIso: string): number => (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000;

/** Whether `iso` falls on the same calendar day as `now`. */
export const isSameDay = (iso: string, now = new Date()): boolean => {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

/** `YYYY-MM-DD` key in local time, used to bucket data per day. */
export const dayKey = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** Zero-padded `YYYY-MM-DD` key in local time (sortable, used for history). */
export const isoDayKey = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const average = (values: number[]): number | null => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

export const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);

/** A time interval with ISO-8601 `start`/`end` timestamps. */
export interface SleepInterval {
  start: string;
  end: string;
}

/** Max gap (minutes) tolerated within a single sleep session before splitting. */
const SLEEP_SESSION_GAP_MIN = 180;

/** Window (ms) around the most recent sample considered for the "main" session. */
const MAIN_SLEEP_WINDOW_MS = 24 * 60 * 60 * 1000;

const toRanges = (intervals: SleepInterval[]): { start: number; end: number }[] =>
  intervals
    .map((i) => ({ start: new Date(i.start).getTime(), end: new Date(i.end).getTime() }))
    .filter((i) => Number.isFinite(i.start) && Number.isFinite(i.end) && i.end > i.start)
    .sort((a, b) => a.start - b.start);

/**
 * Total minutes covered by the *union* of the intervals, merging overlaps so
 * that time covered by several samples (e.g. multiple health data sources) is
 * counted only once. Prevents the inflated totals produced by naively summing
 * each sample's duration.
 */
export const unionMinutes = (intervals: SleepInterval[]): number => {
  const ranges = toRanges(intervals);
  if (!ranges.length) return 0;
  let total = 0;
  let { start, end } = ranges[0]!;
  for (let i = 1; i < ranges.length; i += 1) {
    const seg = ranges[i]!;
    if (seg.start <= end) {
      if (seg.end > end) end = seg.end;
    } else {
      total += end - start;
      start = seg.start;
      end = seg.end;
    }
  }
  total += end - start;
  return total / 60000;
};

/**
 * Splits asleep intervals into sleep sessions (a new session starts when the
 * gap to the previous interval exceeds {@link SLEEP_SESSION_GAP_MIN}) and
 * returns only the intervals of the *main* session: the one with the most
 * asleep time among sessions that ended within 24h of the most recent sample.
 *
 * This avoids two bugs in the previous calendar-day bucketing:
 * - daytime naps / spurious "asleep" detections are kept in their own session
 *   instead of inflating last night's total throughout the day;
 * - the main night is chosen by actual duration, not by which sample happens to
 *   be the most recent.
 */
export const mainSleepSession = <T extends SleepInterval>(intervals: T[]): T[] => {
  const indexed = intervals
    .map((interval) => ({ interval, start: new Date(interval.start).getTime(), end: new Date(interval.end).getTime() }))
    .filter((i) => Number.isFinite(i.start) && Number.isFinite(i.end) && i.end > i.start)
    .sort((a, b) => a.start - b.start);
  if (!indexed.length) return [];

  type Item = (typeof indexed)[number];
  const sessions: Item[][] = [];
  let current: Item[] = [indexed[0]!];
  let clusterEnd = indexed[0]!.end;
  for (let i = 1; i < indexed.length; i += 1) {
    const item = indexed[i]!;
    const gapMin = (item.start - clusterEnd) / 60000;
    if (gapMin > SLEEP_SESSION_GAP_MIN) {
      sessions.push(current);
      current = [item];
      clusterEnd = item.end;
    } else {
      current.push(item);
      if (item.end > clusterEnd) clusterEnd = item.end;
    }
  }
  sessions.push(current);

  const sessionEnd = (s: Item[]): number => Math.max(...s.map((i) => i.end));
  const sessionMinutes = (s: Item[]): number => unionMinutes(s.map((i) => i.interval));
  const latestEnd = Math.max(...sessions.map(sessionEnd));
  const recent = sessions.filter((s) => latestEnd - sessionEnd(s) <= MAIN_SLEEP_WINDOW_MS);
  const main = recent.reduce((best, s) => (sessionMinutes(s) > sessionMinutes(best) ? s : best), recent[0]!);
  return main.map((i) => i.interval);
};

/** Buckets asleep intervals by local wake-day and returns the union hours per day. */
export const sleepHistoryFromIntervals = (intervals: SleepInterval[]): { date: string; sleepHours: number }[] => {
  const perNight = new Map<string, SleepInterval[]>();
  intervals.forEach((interval) => {
    const key = isoDayKey(interval.end);
    const bucket = perNight.get(key) ?? [];
    bucket.push(interval);
    perNight.set(key, bucket);
  });
  return [...perNight.entries()].map(([date, items]) => ({ date, sleepHours: unionMinutes(items) / 60 })).sort((a, b) => a.date.localeCompare(b.date));
};

/** Population standard deviation, or `null` for fewer than 2 samples. */
export const stdDev = (values: number[]): number | null => {
  if (values.length < 2) return null;
  const mean = sum(values) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};
