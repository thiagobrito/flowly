import { APP_TIME_ZONE, localDateKey } from '@/lib/date';
import { api } from '@/lib/network';

import type { FrequencyConfig, ScheduledSlot, Subtask, Task } from '../NewTask/data';
import { getOnceStartISO, getTaskDurationMin } from './eventMapping';

export function toLocalTimeHM(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

/** Frequência `once` (data + hora locais) a partir de um instante ISO do calendário. */
export function onceFrequencyFromISO(dateTimeISO: string): Extract<FrequencyConfig, { kind: 'once' }> {
  const date = new Date(dateTimeISO);
  return {
    kind: 'once',
    date: localDateKey(date),
    time: toLocalTimeHM(date),
  };
}

/** Slot atual da tarefa (do servidor): lista `schedule` ou horário de `once`. */
export function getTaskSlot(task: Task, dateKey?: string): ScheduledSlot | null {
  if (Array.isArray(task.schedule)) {
    const valid = task.schedule.filter((slot) => Boolean(slot?.dateTime));
    const match = dateKey ? valid.find((slot) => localDateKey(new Date(slot.dateTime)) === dateKey) : valid[0];
    if (match) return match;
  }

  const onceISO = getOnceStartISO(task);
  if (!onceISO) return null;

  return { dateTime: onceISO, duration: getTaskDurationMin(task) };
}

export function hasScheduleChanged(previous: ScheduledSlot | null, startISO: string, durationMin: number): boolean {
  if (!previous) return true;

  const prevStart = new Date(previous.dateTime).getTime();
  const nextStart = new Date(startISO).getTime();
  return prevStart !== nextStart || previous.duration !== durationMin;
}

async function syncOnceTaskSchedule(task: Task, startISO: string, durationMin: number): Promise<void> {
  const date = localDateKey(new Date(startISO));
  const time = toLocalTimeHM(new Date(startISO));

  await api.put('/tasks', {
    id: task.id,
    isEditing: true,
    name: task.name,
    energy: task.energy,
    impact: task.impact,
    // Tarefas vindas da API expõem a área em `goal.name`; `area` costuma estar
    // indefinido, o que quebrava o vínculo com a meta ao reagendar.
    area: task.area ?? task.goal?.name,
    subtasks: task.subtasks,
    // Para `once`, a duração do evento é o tempo estimado.
    estimatedMinutes: durationMin,
    frequency: { kind: 'once', date, time },
  });
}

async function syncRecurringTaskSchedule(task: Task, startISO: string, durationMin: number): Promise<void> {
  await api.post('/tasks/schedule', {
    taskId: task.id,
    date: localDateKey(new Date(startISO)),
    startISO,
    durationMin,
  });
}

/** Persiste no servidor o novo horário da tarefa para o dia do `startISO`. */
export async function syncTaskScheduleToServer(task: Task, startISO: string, durationMin: number): Promise<void> {
  if (task.frequency.kind === 'once') {
    await syncOnceTaskSchedule(task, startISO, durationMin);
    return;
  }

  await syncRecurringTaskSchedule(task, startISO, durationMin);
}

async function syncOnceTaskUnschedule(task: Task): Promise<void> {
  await api.put('/tasks', {
    id: task.id,
    isEditing: true,
    name: task.name,
    energy: task.energy,
    impact: task.impact,
    area: task.area ?? task.goal?.name,
    subtasks: task.subtasks,
    estimatedMinutes: task.estimatedMinutes,
    frequency: { kind: 'notime' },
  });
}

async function syncRecurringTaskUnschedule(task: Task, dateKey: string): Promise<void> {
  await api.delete('/tasks/schedule', { params: { id: task.id, date: dateKey } });
}

/** Remove no servidor o agendamento da tarefa para o dia informado. */
export async function syncTaskUnscheduleToServer(task: Task, dateKey: string): Promise<void> {
  if (task.frequency.kind === 'once') {
    await syncOnceTaskUnschedule(task);
    return;
  }

  await syncRecurringTaskUnschedule(task, dateKey);
}

/** Persiste o array completo de sub-tarefas sem alterar frequência/agendamento. */
export async function syncTaskSubtasksToServer(task: Task, nextSubtasks: Subtask[]): Promise<void> {
  await api.put('/tasks', {
    id: task.id,
    isEditing: true,
    name: task.name,
    description: task.description,
    energy: task.energy,
    impact: task.impact,
    area: task.area ?? task.goal?.name,
    subtasks: nextSubtasks,
    estimatedMinutes: task.estimatedMinutes,
    frequency: task.frequency,
  });
}

/** Persiste nome e descrição sem alterar frequência/agendamento. */
export async function syncTaskDetailsToServer(task: Task, details: { name: string; description: string }): Promise<void> {
  await api.put('/tasks', {
    id: task.id,
    isEditing: true,
    name: details.name,
    description: details.description,
    energy: task.energy,
    impact: task.impact,
    area: task.area ?? task.goal?.name,
    subtasks: task.subtasks,
    estimatedMinutes: task.estimatedMinutes,
    frequency: task.frequency,
  });
}

/** Persiste o tempo estimado da tarefa sem alterar frequência/agendamento. */
export async function syncTaskEstimatedMinutesToServer(task: Task, estimatedMinutes: number): Promise<void> {
  await api.put('/tasks', {
    id: task.id,
    isEditing: true,
    name: task.name,
    description: task.description,
    energy: task.energy,
    impact: task.impact,
    area: task.area ?? task.goal?.name,
    subtasks: task.subtasks,
    estimatedMinutes,
    frequency: task.frequency,
  });
}
