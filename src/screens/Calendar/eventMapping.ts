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
  let areaColor = getLifeArea(task.goal.name)?.accent;

  if (areaColor) {
    if (task.done) areaColor += '20';
    else areaColor += '90';
  }
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
    hasBorder: !task.done,
    task,
  };
}

/** Monta um evento de calendário a partir de uma tarefa e um horário de início. */
/*
export function buildTaskEvent(task: Task, startISO: string, durationMin = getTaskDurationMin(task)): CalendarTaskEvent {
  return buildEvent(task, task.id, startISO, durationMin);
}
*/
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

function shouldAddTaskToUnscheduled(task: Task): boolean {
  if (task.frequency.kind === 'once' || task.frequency.kind === 'notime') {
    if (task.schedule && task.schedule.length > 0) {
      return false;
    }
  }
  return true;
}

/**
 * Converte as tarefas em eventos do calendário usando exclusivamente o
 * agendamento vindo do servidor: a lista `task.schedule` (momento + duração) e,
 * na ausência dela, a `frequency` do tipo `once`.
 *
 * O agendamento é por dia: um slot só vira evento quando o seu dia está dentro
 * do intervalo exibido (`visibleDateKeys`). Tarefas que o servidor retornou como
 * devidas no período mas que não têm slot para nenhum dia visível (ex.: uma
 * tarefa diária agendada apenas em outro dia) caem em `unscheduled` (bandeja),
 * em vez de virarem um evento invisível posicionado fora da tela.
 *
 * Quando `visibleDateKeys` não é informado, todos os slots viram eventos
 * (comportamento legado, sem filtro por dia).
 */
export function buildCalendarEvents(tasks: Task[], visibleDateKeys?: Set<string>): MappingResult {
  const events: CalendarTaskEvent[] = [];
  const unscheduled: Task[] = [];

  const isVisibleDay = (dateTime: string): boolean => {
    return !visibleDateKeys || visibleDateKeys.has(localDateKey(new Date(dateTime)));
  };

  for (const task of tasks) {
    if (!task.id) {
      unscheduled.push(task);
    } else {
      const visibleSlots = scheduleSlots(task).filter((slot) => {
        return isVisibleDay(slot.dateTime);
      });

      if (visibleSlots.length > 0) {
        for (const slot of visibleSlots) {
          const dateKey = localDateKey(new Date(slot.dateTime));
          events.push(buildEvent(task, eventId(task.id, dateKey), slot.dateTime, slot.duration));
        }
      } else {
        const onceISO = getOnceStartISO(task);
        if (onceISO && isVisibleDay(onceISO)) {
          events.push(buildEvent(task, task.id, onceISO, getTaskDurationMin(task)));
        } else if (!task.done) {
          if (shouldAddTaskToUnscheduled(task)) unscheduled.push(task);
        }
      }
    }
  }

  return { events, unscheduled };
}
