/**
 * Lembretes de início de tarefa.
 *
 * Agenda notificações locais para cada tarefa com horário no calendário do dia:
 * uma 10 minutos antes do início e outra no horário exato. Tudo via
 * `@/lib/notifications`.
 *
 * O cancelamento é seletivo (filtra por `data.type === TASK_REMINDER_DATA_TYPE`)
 * para não afetar outras notificações agendadas pelo app.
 */

import { toLocalISOString } from '@/lib/date';
import { api } from '@/lib/network';
import { ensureAndroidChannel, getPermissionStatus, getScheduledNotifications, notifications } from '@/lib/notifications';
import { getNotificationsConfig } from '@/lib/notifications/config';
import { getOnceStartISO } from '@/screens/Calendar/eventMapping';
import type { Task } from '@/screens/NewTask/data';
import { getWeekDates } from '@/screens/Tasks/taskDateFilter';

/** Tag em `content.data.type` que identifica notificações deste módulo. */
export const TASK_REMINDER_DATA_TYPE = 'task_reminder';

/** Antecedência (minutos) do lembrete "prepare-se". */
export const REMINDER_LEAD_MIN = 10;

/**
 * Limite de notificações pendentes a agendar. O iOS limita em 64 notificações
 * locais pendentes; deixamos uma folga.
 */
const MAX_SCHEDULED = 60;

/**
 * `energyLevel` usado apenas para buscar a agenda da semana. Os slots agendados
 * não dependem do nível de energia; usamos o mesmo valor neutro do Calendar.
 */
const FETCH_ENERGY_LEVEL = 5;

type ReminderKind = 'lead' | 'start';

type PlannedReminder = {
  date: Date;
  taskId: string;
  taskName: string;
  slot: string;
  kind: ReminderKind;
};

type TasksResponse = {
  visibleTasks?: Task[];
};

function organizeTasks(tasks: unknown): Task[] {
  if (!Array.isArray(tasks)) return [];

  return tasks.map((task) => {
    const item = task as Task & { _id?: string };
    return {
      ...item,
      // eslint-disable-next-line no-underscore-dangle -- campo `_id` retornado pela API MongoDB
      id: item.id ?? item._id ?? '',
    };
  });
}

/** Busca as tarefas visíveis (não concluídas) da semana, deduplicadas por id. */
async function fetchWeekVisibleTasks(): Promise<Task[]> {
  const weekDates = getWeekDates();
  const results = await Promise.allSettled(
    weekDates.map((date) =>
      api.get<TasksResponse>('/tasks', {
        params: { date: toLocalISOString(date), energyLevel: FETCH_ENERGY_LEVEL },
      }),
    ),
  );

  const byId = new Map<string, Task>();
  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const task of organizeTasks(result.value.visibleTasks)) {
        if (task.id) byId.set(task.id, task);
      }
    }
  }

  return Array.from(byId.values());
}

/** Mescla tarefas recém-alteradas (ex.: calendário) sobre o resultado da API. */
function mergeTasks(fetched: Task[], hints?: Task[]): Task[] {
  if (!hints?.length) return fetched;

  const byId = new Map(fetched.map((task) => [task.id, task]));
  const extra: Task[] = [];

  for (const hint of hints) {
    if (hint.id) {
      byId.set(hint.id, { ...byId.get(hint.id), ...hint });
    } else {
      extra.push(hint);
    }
  }

  return [...Array.from(byId.values()), ...extra];
}

/** Horários de início de uma tarefa: slots do calendário ou frequency.once. */
function startTimesFor(task: Task): string[] {
  const slots = (Array.isArray(task.schedule) ? task.schedule : []).map((slot) => slot?.dateTime).filter((dateTime): dateTime is string => Boolean(dateTime) && !Number.isNaN(new Date(dateTime).getTime()));

  if (slots.length > 0) return slots;

  const once = getOnceStartISO(task);
  return once ? [once] : [];
}

/** Constrói os lembretes futuros a partir dos horários de início das tarefas. */
function buildPlannedReminders(tasks: Task[], now: number): PlannedReminder[] {
  const planned: PlannedReminder[] = [];

  for (const task of tasks) {
    for (const startISO of startTimesFor(task)) {
      const startMs = new Date(startISO).getTime();
      const leadMs = startMs - REMINDER_LEAD_MIN * 60_000;

      if (leadMs > now) {
        planned.push({ date: new Date(leadMs), taskId: task.id, taskName: task.name, slot: startISO, kind: 'lead' });
      }
      if (startMs > now) {
        planned.push({ date: new Date(startMs), taskId: task.id, taskName: task.name, slot: startISO, kind: 'start' });
      }
    }
  }

  return planned.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_SCHEDULED);
}

function reminderContent(reminder: PlannedReminder) {
  const isLead = reminder.kind === 'lead';
  return {
    title: isLead ? `Prepare-se: ${reminder.taskName}` : `Hora de iniciar: ${reminder.taskName}`,
    body: isLead ? 'Sua tarefa começa em 10 minutos.' : 'Está na hora de começar esta tarefa.',
    sound: true,
    data: {
      type: TASK_REMINDER_DATA_TYPE,
      taskId: reminder.taskId,
      slot: reminder.slot,
      kind: reminder.kind,
    },
  };
}

/** Cancela apenas as notificações agendadas por este módulo. */
export async function cancelTaskReminders(): Promise<void> {
  try {
    const scheduled = await getScheduledNotifications();
    await Promise.all(scheduled.filter((item) => (item.content?.data as { type?: string } | undefined)?.type === TASK_REMINDER_DATA_TYPE).map((item) => notifications.cancel(item.identifier)));
  } catch {
    // Notificações indisponíveis (ex.: Expo Go) — silenciosamente ignora.
  }
}

/**
 * Sincroniza os lembretes de início de tarefa. Sempre cancela os lembretes
 * antigos deste módulo antes de reagendar. Quando `enabled` é `false`, apenas
 * cancela.
 *
 * Passe `tasksHint` com tarefas recém-agendadas para evitar corrida com a API.
 */
export async function syncTaskReminders({ enabled, tasksHint }: { enabled: boolean; tasksHint?: Task[] }): Promise<void> {
  if (!enabled) {
    await cancelTaskReminders();
    return;
  }

  const permission = await getPermissionStatus();
  if (permission !== 'granted') {
    return;
  }

  let fetched: Task[];
  try {
    fetched = await fetchWeekVisibleTasks();
  } catch {
    return;
  }

  const tasks = mergeTasks(fetched, tasksHint);
  const planned = buildPlannedReminders(tasks, Date.now());

  try {
    await ensureAndroidChannel();
    await cancelTaskReminders();

    if (planned.length === 0) return;

    const { telemetry } = getNotificationsConfig();
    const results = await Promise.allSettled(planned.map((reminder) => notifications.scheduleAt(reminderContent(reminder), reminder.date)));

    for (const result of results) {
      if (result.status === 'rejected') {
        telemetry.reportError(result.reason, { source: 'syncTaskReminders' });
      }
    }
  } catch (error) {
    getNotificationsConfig().telemetry.reportError(error, { source: 'syncTaskReminders' });
  }
}
