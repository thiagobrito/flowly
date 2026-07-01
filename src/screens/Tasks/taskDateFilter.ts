import type { LucideIcon } from 'lucide-react-native';
import { CalendarClock, CalendarRange, CalendarX, Sun } from 'lucide-react-native';

import { APP_TIME_ZONE, localDateKey, startOfLocalDay } from '@/lib/date';

import type { Task } from '../NewTask/data';

export type DateFilterId = 'today' | 'tomorrow' | 'thisWeek' | 'nodate';

export type DateFilterOption = {
  id: DateFilterId;
  label: string;
  Icon: LucideIcon;
  accent: string;
};

export const DATE_FILTERS: DateFilterOption[] = [
  { id: 'today', label: 'Hoje', Icon: Sun, accent: '#f59e0b' },
  { id: 'tomorrow', label: 'Amanhã', Icon: CalendarClock, accent: '#8b5cf6' },
  { id: 'thisWeek', label: 'Esta semana', Icon: CalendarRange, accent: '#3b82f6' },
  { id: 'nodate', label: 'Sem data', Icon: CalendarX, accent: '#ef4444' },
];

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getWeekdayIndex(date: Date, timeZone = APP_TIME_ZONE): number {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  return WEEKDAY_INDEX[weekday] ?? 0;
}

function addDays(reference: Date, days: number): Date {
  const start = startOfLocalDay(reference);
  return new Date(start.getTime() + days * 86_400_000);
}

/** Retorna as 7 datas (dom→sáb) da semana corrente, normalizadas à meia-noite local. */
export function getWeekDates(reference: Date = new Date()): Date[] {
  const todayStart = startOfLocalDay(reference);
  const dayOfWeek = getWeekdayIndex(todayStart);
  const sundayStart = new Date(todayStart.getTime() - dayOfWeek * 86_400_000);
  return Array.from({ length: 7 }, (_, index) => new Date(sundayStart.getTime() + index * 86_400_000));
}

/** Retorna as 7 chaves de data (dom→sáb) da semana corrente no fuso do app. */
export function getWeekDateKeys(reference: Date = new Date()): string[] {
  return getWeekDates(reference).map((date) => localDateKey(date));
}

/** Extrai todas as datas civis explícitas de uma tarefa (`schedule` + `once.date`). */
export function getTaskDateKeys(task: Task): Set<string> {
  const keys = new Set<string>();

  if (Array.isArray(task.schedule)) {
    for (const slot of task.schedule) {
      if (slot?.dateTime) {
        const parsed = new Date(slot.dateTime);
        if (!Number.isNaN(parsed.getTime())) {
          keys.add(localDateKey(parsed));
        }
      }
    }
  }

  if (task.frequency.kind === 'once' && task.frequency.date) {
    keys.add(task.frequency.date);
  }

  return keys;
}

export function taskMatchesDateFilter(task: Task, filterId: DateFilterId, reference: Date = new Date()): boolean {
  const keys = getTaskDateKeys(task);
  const todayKey = localDateKey(reference);
  const tomorrowKey = localDateKey(addDays(reference, 1));
  const weekKeys = new Set(getWeekDateKeys(reference));

  switch (filterId) {
    case 'today':
      return keys.has(todayKey);
    case 'tomorrow':
      return keys.has(tomorrowKey);
    case 'thisWeek':
      return [...keys].some((key) => weekKeys.has(key));
    case 'nodate':
      return keys.size === 0;
    default:
      return true;
  }
}
