/**
 * Lembretes de início de tarefa.
 *
 * Agenda notificações locais para cada slot agendado de tarefa: uma 5 minutos
 * antes do início e outra no horário exato. Tudo via `@/lib/notifications`.
 *
 * O cancelamento é seletivo (filtra por `data.type === TASK_REMINDER_DATA_TYPE`)
 * para não afetar outras notificações agendadas pelo app.
 */

import { toLocalISOString } from '@/lib/date';
import { api } from '@/lib/network';
import { ensureAndroidChannel, getScheduledNotifications, notifications } from '@/lib/notifications';
import type { Task } from '@/screens/NewTask/data';
import { getWeekDates } from '@/screens/Tasks/taskDateFilter';

/** Tag em `content.data.type` que identifica notificações deste módulo. */
export const TASK_REMINDER_DATA_TYPE = 'task_reminder';

/** Antecedência (minutos) do lembrete "prepare-se". */
export const REMINDER_LEAD_MIN = 5;

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

/** Constrói os lembretes futuros a partir dos slots agendados das tarefas. */
function buildPlannedReminders(tasks: Task[], now: number): PlannedReminder[] {
  const planned: PlannedReminder[] = [];

  for (const task of tasks) {
    const slots = Array.isArray(task.schedule) ? task.schedule : [];

    for (const slot of slots) {
      const startMs = slot?.dateTime ? new Date(slot.dateTime).getTime() : Number.NaN;
      if (slot?.dateTime && !Number.isNaN(startMs)) {
        const leadMs = startMs - REMINDER_LEAD_MIN * 60_000;
        if (leadMs > now) {
          planned.push({ date: new Date(leadMs), taskId: task.id, taskName: task.name, slot: slot.dateTime, kind: 'lead' });
        }
        if (startMs > now) {
          planned.push({ date: new Date(startMs), taskId: task.id, taskName: task.name, slot: slot.dateTime, kind: 'start' });
        }
      }
    }
  }

  return planned.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_SCHEDULED);
}

function reminderContent(reminder: PlannedReminder) {
  const isLead = reminder.kind === 'lead';
  return {
    title: isLead ? `Prepare-se: ${reminder.taskName}` : `Hora de iniciar: ${reminder.taskName}`,
    body: isLead ? 'Sua tarefa começa em 5 minutos.' : 'Está na hora de começar esta tarefa.',
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
 */
export async function syncTaskReminders({ enabled }: { enabled: boolean }): Promise<void> {
  await cancelTaskReminders();

  if (!enabled) return;

  try {
    await ensureAndroidChannel();

    const tasks = await fetchWeekVisibleTasks();
    const planned = buildPlannedReminders(tasks, Date.now());

    await Promise.all(planned.map((reminder) => notifications.scheduleAt(reminderContent(reminder), reminder.date)));
  } catch {
    // Falha de rede ou notificações indisponíveis — não quebra o app.
  }
}
