import type { LucideIcon } from 'lucide-react-native';
import { CalendarClock, CalendarRange, CalendarX, Sun } from 'lucide-react-native';

import { APP_TIME_ZONE, localDateKey, startOfLocalDay } from '@/lib/date';
import { ACCENT } from '@/lib/theme';

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
  { id: 'thisWeek', label: 'Esta semana', Icon: CalendarRange, accent: ACCENT },
  { id: 'nodate', label: 'A definir', Icon: CalendarX, accent: '#ef4444' },
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

/** Meia-noite local do dia seguinte ao de referência (no fuso do app). */
export function getTomorrowDate(reference: Date = new Date()): Date {
  return addDays(reference, 1);
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

function civilDayFromIso(iso: string): string | null {
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

/** Extrai todas as datas civis explícitas de uma tarefa (`schedule` + `once.date`). */
export function getTaskDateKeys(task: Task): Set<string> {
  const keys = new Set<string>();

  if (Array.isArray(task.schedule)) {
    for (const slot of task.schedule) {
      if (slot?.dateTime) {
        const key = civilDayFromIso(slot.dateTime) ?? localDateKey(new Date(slot.dateTime));
        if (key) keys.add(key);
      }
    }
  }

  if (task.frequency.kind === 'once' && task.frequency.date) {
    keys.add(task.frequency.date);
  }

  return keys;
}

// Dia da semana (0 = domingo) a partir de um dia civil `YYYY-MM-DD`, usando a
// mesma matemática do servidor (`localDayOfWeek`) para não depender do fuso do
// dispositivo.
function weekdayOfKey(dayKey: string): number {
  const [yearStr, monthStr, dayStr] = dayKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return 0;
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * Espelha a parte recorrente de `isDueToday` do servidor
 * (`web/src/lib/tasks/filter.js`): decide se a tarefa está marcada para um
 * dia civil por recorrência de dia da semana.
 *
 * - `once` não entra aqui: sua data explícita já é tratada por `getTaskDateKeys`.
 * - `notime` / `trigger` / `interval` não pertencem a um dia.
 * - `weekly` com `mode: 'count'` (sem dias específicos) vai para "A definir".
 */
export function isDueOn(task: Task, dayKey: string): boolean {
  if (getTaskDateKeys(task).has(dayKey)) return true;

  const { frequency } = task;
  switch (frequency.kind) {
    case 'daily':
      return frequency.everyDay || frequency.days.includes(weekdayOfKey(dayKey));
    case 'weekly':
      if (frequency.days.length === 0) return false;
      return frequency.days.includes(weekdayOfKey(dayKey));
    case 'notime':
    case 'once':
    case 'trigger':
    case 'interval':
      return false;
    default:
      return false;
  }
}

/** Tarefa com dia marcado no passado, ainda não devida hoje. */
export function isOverdue(task: Task, todayKey: string): boolean {
  if (isDueOn(task, todayKey)) return false;
  const keys = getTaskDateKeys(task);
  return [...keys].some((key) => key < todayKey);
}

/** Tarefa sem associação a nenhum dia específico. Lista "A definir". */
export function hasNoDate(task: Task): boolean {
  if (getTaskDateKeys(task).size > 0) return false;
  const { frequency } = task;
  if (frequency.kind === 'trigger' || frequency.kind === 'notime' || frequency.kind === 'interval') return true;
  if (frequency.kind === 'once' && frequency.date == null) return true;
  if (frequency.kind === 'weekly' && frequency.days.length === 0) return true;
  return false;
}

export type OpenTaskBucket = 'today' | 'overdue' | 'nodate';

/**
 * Recorte das listas abertas da Home. O fallback `today` evita que uma tarefa
 * pendente suma se não casar com overdue/nodate (ex.: `once` no futuro).
 */
export function classifyOpenTask(task: Task, todayKey: string): OpenTaskBucket {
  if (isDueOn(task, todayKey)) return 'today';
  if (isOverdue(task, todayKey)) return 'overdue';
  if (hasNoDate(task)) return 'nodate';
  return 'today';
}

export function taskMatchesDateFilter(task: Task, filterId: DateFilterId, reference: Date = new Date()): boolean {
  const todayKey = localDateKey(reference);
  const tomorrowKey = localDateKey(addDays(reference, 1));
  const weekKeys = getWeekDateKeys(reference);

  switch (filterId) {
    case 'today':
      return isDueOn(task, todayKey);
    case 'tomorrow':
      return isDueOn(task, tomorrowKey);
    case 'thisWeek':
      return weekKeys.some((dayKey) => isDueOn(task, dayKey));
    case 'nodate':
      return hasNoDate(task);
    default:
      return true;
  }
}
