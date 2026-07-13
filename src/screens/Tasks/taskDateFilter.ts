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
 * (`server/src/lib/tasks/filter.js`): decide se a tarefa "pode ser realizada"
 * num dia civil arbitrário por recorrência de dia da semana.
 *
 * - `once` não entra aqui: sua data explícita já é tratada por `getTaskDateKeys`
 *   (o caso "atrasada" é resolvido por `isOverdueOnce`, ligado ao dia de hoje).
 * - `notime` sem conclusão está disponível qualquer dia (mesmo critério do
 *   servidor); após concluída, deixa de ser "para fazer".
 * - `weekly` com `mode: 'count'` (sem dias específicos) é flexível: disponível
 *   qualquer dia da semana.
 * - `trigger` retorna `false` — não pertence a um dia específico.
 * - `interval` mantém o comportamento "sempre disponível" do servidor.
 */
export function isDueOn(task: Task, dayKey: string): boolean {
  const { frequency } = task;
  switch (frequency.kind) {
    case 'daily':
      return frequency.everyDay || frequency.days.includes(weekdayOfKey(dayKey));
    case 'weekly':
      if (frequency.days.length === 0) return true;
      return frequency.days.includes(weekdayOfKey(dayKey));
    case 'notime':
      return (task.completed ?? []).length === 0;
    case 'once':
    case 'trigger':
      return false;
    default:
      return true;
  }
}

// Tarefa `once` vencida (data anterior a hoje) e ainda pendente: deve aparecer
// em "Hoje" (faça agora), não em "Amanhã".
function isOverdueOnce(task: Task, todayKey: string): boolean {
  return task.frequency.kind === 'once' && task.frequency.date != null && task.frequency.date < todayKey;
}

// Tarefa sem associação a nenhum dia específico (nem data explícita, nem
// recorrência de dia). É o que deve aparecer em "Sem data".
function hasNoDate(task: Task): boolean {
  if (getTaskDateKeys(task).size > 0) return false;
  const { frequency } = task;
  if (frequency.kind === 'trigger') return true;
  if (frequency.kind === 'once' && frequency.date == null) return true;
  // `notime` sem conclusão é "para hoje" (mesmo critério do servidor); só cai em
  // "Sem data" depois de concluída.
  if (frequency.kind === 'notime') return (task.completed ?? []).length > 0;
  return false;
}

export function taskMatchesDateFilter(task: Task, filterId: DateFilterId, reference: Date = new Date()): boolean {
  const keys = getTaskDateKeys(task);
  const todayKey = localDateKey(reference);
  const tomorrowKey = localDateKey(addDays(reference, 1));
  const weekKeys = getWeekDateKeys(reference);

  const matchesDay = (dayKey: string) => keys.has(dayKey) || isDueOn(task, dayKey);

  switch (filterId) {
    case 'today':
      return matchesDay(todayKey) || isOverdueOnce(task, todayKey);
    case 'tomorrow':
      return matchesDay(tomorrowKey);
    case 'thisWeek':
      // A semana contém hoje, então tarefas vencidas também entram aqui.
      return weekKeys.some(matchesDay) || isOverdueOnce(task, todayKey);
    case 'nodate':
      return hasNoDate(task);
    default:
      return true;
  }
}
