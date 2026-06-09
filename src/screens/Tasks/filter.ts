import type { Task } from '../NewTask/data';

// Formata uma data no fuso local como `YYYY-MM-DD` para comparações por dia.
function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isCompletedToday(task: Task, todayKey: string): boolean {
  return (task.completed ?? []).some((iso) => localDateKey(new Date(iso)) === todayKey);
}

function completionsThisWeek(task: Task, now: Date): number {
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  return (task.completed ?? []).filter((iso) => new Date(iso) >= startOfWeek).length;
}

function lastCompletion(task: Task): Date | null {
  const list = task.completed ?? [];
  if (list.length === 0) return null;
  return list.map((iso) => new Date(iso)).reduce((latest, current) => (current > latest ? current : latest));
}

function daysBetween(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

function isDueToday(task: Task, now: Date, todayKey: string): boolean {
  const weekday = now.getDay(); // 0 = Dom ... 6 = Sáb (mesmo índice usado em WEEKDAYS)
  const { frequency } = task;

  switch (frequency.kind) {
    case 'once':
      // Pontual: vence no dia agendado e permanece até ser concluída (atrasadas continuam visíveis).
      return frequency.date != null && frequency.date <= todayKey;
    case 'daily':
      return frequency.everyDay || frequency.days.includes(weekday);
    case 'weekly':
      if (frequency.mode === 'days') return frequency.days.includes(weekday);
      // Modo "Nx por semana": disponível enquanto não atingir a meta da semana.
      return completionsThisWeek(task, now) < frequency.count;
    case 'interval': {
      const last = lastCompletion(task);
      if (!last) return true;
      return daysBetween(last, now) >= frequency.everyNDays;
    }
    case 'trigger':
      // Baseada em evento, não em data: sempre disponível.
      return true;
    default:
      return true;
  }
}

export default function FilterTasksToShow(tasks: Task[]): Task[] {
  const now = new Date();
  const todayKey = localDateKey(now);

  return tasks.filter((task) => {
    // remove tasks that are already completed today
    if (isCompletedToday(task, todayKey)) return false;
    // remove tasks that the frequency is not met for today
    if (!isDueToday(task, now, todayKey)) return false;
    return true;
  });
}
