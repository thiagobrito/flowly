import type { Task } from '../NewTask/data';

function parseTimeMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const [hourStr, minuteStr] = time.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function civilDayFromIso(iso: string | undefined): string | null {
  const match = String(iso ?? '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function minutesFromIso(iso: string | undefined): number | null {
  const match = String(iso ?? '').match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutos desde meia-noite do horário marcado, ou `null` se não houver hora. */
export function taskStartMinutes(task: Task, todayKey: string): number | null {
  const slots = Array.isArray(task.schedule) ? task.schedule : [];
  const todaySlot = slots.find((slot) => civilDayFromIso(slot?.dateTime) === todayKey);
  if (todaySlot) {
    const minutes = minutesFromIso(todaySlot.dateTime);
    if (minutes != null) return minutes;
  }

  const { frequency } = task;
  if (frequency.kind === 'once' && frequency.time) {
    const dateKey = frequency.date ? frequency.date.split('T')[0] : null;
    if (!dateKey || dateKey <= todayKey) return parseTimeMinutes(frequency.time);
  }

  const pastSlots = slots
    .filter((slot) => {
      const key = civilDayFromIso(slot?.dateTime);
      return key != null && key < todayKey;
    })
    .sort((left, right) => String(civilDayFromIso(right.dateTime)).localeCompare(String(civilDayFromIso(left.dateTime))));

  if (pastSlots[0]) return minutesFromIso(pastSlots[0].dateTime);

  return null;
}

/**
 * Horário marcado primeiro; sem horário, menor energia e maior impacto.
 * Espelha `web/src/lib/tasks/sortBySchedule.js`.
 */
export function sortTasksBySchedule(tasks: Task[], todayKey: string): Task[] {
  return [...tasks].sort((left, right) => {
    const leftMinutes = taskStartMinutes(left, todayKey);
    const rightMinutes = taskStartMinutes(right, todayKey);
    const leftHasTime = leftMinutes != null;
    const rightHasTime = rightMinutes != null;

    if (leftHasTime && rightHasTime && leftMinutes !== rightMinutes) return leftMinutes - rightMinutes;
    if (leftHasTime !== rightHasTime) return leftHasTime ? -1 : 1;

    const leftEnergy = left.energy ?? 3;
    const rightEnergy = right.energy ?? 3;
    if (leftEnergy !== rightEnergy) return leftEnergy - rightEnergy;

    return (right.impact ?? 3) - (left.impact ?? 3);
  });
}
