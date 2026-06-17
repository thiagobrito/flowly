import type { EventItem } from '@howljs/calendar-kit';

import { APP_TIME_ZONE, localDateKey, toLocalISOString } from '@/lib/date';

import type { ScheduledSlot, Task } from '../NewTask/data';
import { getLifeArea } from '../NewTask/data';

/** Duração padrão (min) quando a tarefa não tem tempo estimado. */
export const DEFAULT_DURATION_MIN = 30;

const FALLBACK_COLOR = '#dbf5ec';

/** Evento do calendário enriquecido com a tarefa de origem. */
export type CalendarTaskEvent = EventItem & { task: Task };

export type MappingResult = {
  events: CalendarTaskEvent[];
  /** Tarefas sem horário/momento definido (vão para a bandeja). */
  unscheduled: Task[];
};

/** Tempo gasto = estimativa da tarefa; cai para o padrão quando ausente. */
export function getTaskDurationMin(task: Task): number {
  return task.estimatedMinutes && task.estimatedMinutes > 0 ? task.estimatedMinutes : DEFAULT_DURATION_MIN;
}

function eventColor(task: Task): string {
  let areaColor = getLifeArea(task.area)?.accent;
  if (areaColor) areaColor += '80';
  return areaColor ?? FALLBACK_COLOR;
}

/** Id único por ocorrência: uma tarefa pode estar agendada em vários dias. */
function eventId(taskId: string, dateKey: string): string {
  return `${taskId}::${dateKey}`;
}

function buildEvent(task: Task, id: string, startISO: string, durationMin: number): CalendarTaskEvent {
  const start = new Date(startISO);
  const end = new Date(start.getTime() + durationMin * 60_000);

  return {
    id,
    title: task.name,
    start: { dateTime: toLocalISOString(start, APP_TIME_ZONE), timeZone: APP_TIME_ZONE },
    end: { dateTime: toLocalISOString(end, APP_TIME_ZONE), timeZone: APP_TIME_ZONE },
    color: eventColor(task),
    task,
  };
}

/** Monta um evento de calendário a partir de uma tarefa e um horário de início. */
export function buildTaskEvent(task: Task, startISO: string, durationMin = getTaskDurationMin(task)): CalendarTaskEvent {
  return buildEvent(task, task.id, startISO, durationMin);
}

/** Horário inicial para tarefas de frequência `once` (data + hora). */
export function getOnceStartISO(task: Task): string | null {
  if (task.frequency.kind !== 'once' || !task.frequency.date) return null;

  const [year = 0, month = 1, day = 1] = task.frequency.date.split('-').map(Number);
  const [hour = 9, minute = 0] = (task.frequency.time ?? '09:00').split(':').map(Number);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Slots de agendamento válidos da tarefa (apenas o que veio do servidor). */
function scheduleSlots(task: Task): ScheduledSlot[] {
  if (!Array.isArray(task.schedule)) return [];
  return task.schedule.filter((slot) => Boolean(slot?.dateTime) && !Number.isNaN(new Date(slot.dateTime).getTime()));
}

/**
 * Converte as tarefas em eventos do calendário usando exclusivamente o
 * agendamento vindo do servidor: a lista `task.schedule` (momento + duração) e,
 * na ausência dela, a `frequency` do tipo `once`. Tarefas sem horário retornam
 * em `unscheduled` (bandeja).
 */
export function buildCalendarEvents(tasks: Task[]): MappingResult {
  const events: CalendarTaskEvent[] = [];
  const unscheduled: Task[] = [];

  for (const task of tasks) {
    if (!task.id) {
      unscheduled.push(task);
    } else {
      const slots = scheduleSlots(task);

      if (slots.length > 0) {
        for (const slot of slots) {
          const dateKey = localDateKey(new Date(slot.dateTime));
          events.push(buildEvent(task, eventId(task.id, dateKey), slot.dateTime, slot.duration));
        }
      } else {
        const onceISO = getOnceStartISO(task);
        if (onceISO) {
          events.push(buildEvent(task, task.id, onceISO, getTaskDurationMin(task)));
        } else {
          unscheduled.push(task);
        }
      }
    }
  }

  return { events, unscheduled };
}
