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

/** Population standard deviation, or `null` for fewer than 2 samples. */
export const stdDev = (values: number[]): number | null => {
  if (values.length < 2) return null;
  const mean = sum(values) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};
