/**
 * Utilidades de agenda do coach mobile — port enxuto de
 * `web/src/lib/coach/schedule.ts`.
 */

import { localDateKey, startOfLocalDay, toLocalISOString } from '@/lib/date';
import type { Task } from '@/screens/NewTask/data';

import type { DayEnergyCurve } from './dayCurve';

export const SLOT_MINUTES = 15;
export const DEFAULT_BLOCK_MINUTES = 45;
const DEFAULT_ONCE_DURATION_MINUTES = 30;
const DEFAULT_ONCE_MINUTE = 9 * 60;
const FALLBACK_AWAKE_START_HOUR = 8;
const FALLBACK_AWAKE_END_HOUR = 22;

export type Interval = { start: number; end: number };
export type BusyInterval = Interval & { taskId: string };

export function taskDurationMinutes(task: Task): number {
  return task.estimatedMinutes && task.estimatedMinutes > 0 ? task.estimatedMinutes : DEFAULT_ONCE_DURATION_MINUTES;
}

function minutesOfHhmm(time: string | null | undefined): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((time ?? '').trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function minutesOfIso(iso: string): number | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours() * 60 + date.getMinutes();
}

export function isoAtDayMinutes(dateKey: string, minutes: number): string {
  const day = startOfLocalDay(dateKey);
  const moment = new Date(day.getTime() + minutes * 60_000);
  return toLocalISOString(moment);
}

function storedBlockForDay(task: Task, dateKey: string): { dateTime: string; duration: number } | null {
  if (!Array.isArray(task.schedule)) return null;
  const match = task.schedule.find((block) => localDateKey(new Date(block.dateTime)) === dateKey);
  return match ?? null;
}

function onceBlockForDay(task: Task, dateKey: string): { dateTime: string; duration: number } | null {
  const { kind, date, time } = task.frequency as { kind: string; date?: string | null; time?: string | null };
  if (kind !== 'once' || date !== dateKey) return null;
  const minutes = minutesOfHhmm(time) ?? DEFAULT_ONCE_MINUTE;
  return { dateTime: isoAtDayMinutes(dateKey, minutes), duration: taskDurationMinutes(task) };
}

export function blockForDay(task: Task, dateKey: string): { dateTime: string; duration: number } | null {
  return storedBlockForDay(task, dateKey) ?? onceBlockForDay(task, dateKey);
}

export function blockDurationMinutes(task: Task): number {
  const raw = task.estimatedMinutes ?? DEFAULT_BLOCK_MINUTES;
  const clamped = Math.min(Math.max(raw, SLOT_MINUTES), 8 * 60);
  return Math.round(clamped / SLOT_MINUTES) * SLOT_MINUTES;
}

export function busyIntervals(tasks: Task[], dateKey: string): BusyInterval[] {
  const intervals: BusyInterval[] = [];
  for (const task of tasks) {
    const block = blockForDay(task, dateKey);
    if (block) {
      const start = minutesOfIso(block.dateTime);
      if (start != null) {
        intervals.push({
          taskId: task.id,
          start,
          end: start + Math.max(block.duration, SLOT_MINUTES),
        });
      }
    }
  }
  return intervals.sort((a, b) => a.start - b.start);
}

function overlaps(candidate: Interval, busy: Interval[]): boolean {
  return busy.some((interval) => candidate.start < interval.end && interval.start < candidate.end);
}

export function awakeRange(curve: DayEnergyCurve): Interval {
  if (!curve.hasProfile || curve.hours.length === 0) {
    return { start: FALLBACK_AWAKE_START_HOUR * 60, end: FALLBACK_AWAKE_END_HOUR * 60 };
  }

  const awake = curve.hours.filter((entry) => !entry.asleep);
  if (awake.length === 0) {
    return { start: FALLBACK_AWAKE_START_HOUR * 60, end: FALLBACK_AWAKE_END_HOUR * 60 };
  }

  return {
    start: awake[0]!.hour * 60,
    end: (awake[awake.length - 1]!.hour + 1) * 60,
  };
}

export function energyOfInterval(curve: DayEnergyCurve, interval: Interval): number {
  const firstHour = Math.floor(interval.start / 60);
  const lastHour = Math.floor((interval.end - 1) / 60);
  let total = 0;
  let count = 0;
  for (let hour = firstHour; hour <= lastHour && hour < 24; hour += 1) {
    const score = curve.hours[hour]?.score;
    if (score != null) {
      total += score;
      count += 1;
    }
  }
  return count === 0 ? 0 : total / count;
}

export type SlotSearch = {
  curve: DayEnergyCurve;
  dateKey: string;
  durationMin: number;
  busy: Interval[];
  earliestMinute?: number;
};

export function findBestSlot(search: SlotSearch): { startMinute: number; startISO: string } | null {
  const { curve, dateKey, durationMin, busy, earliestMinute = 0 } = search;
  const range = awakeRange(curve);
  const from = Math.max(range.start, Math.ceil(earliestMinute / SLOT_MINUTES) * SLOT_MINUTES);
  let best: { startMinute: number; energy: number } | null = null;

  for (let start = from; start + durationMin <= range.end; start += SLOT_MINUTES) {
    const candidate: Interval = { start, end: start + durationMin };
    if (!overlaps(candidate, busy)) {
      const energy = energyOfInterval(curve, candidate);
      if (!best || energy > best.energy) {
        best = { startMinute: start, energy };
      }
    }
  }

  if (!best) return null;
  return { startMinute: best.startMinute, startISO: isoAtDayMinutes(dateKey, best.startMinute) };
}

export function formatHourLabel(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
