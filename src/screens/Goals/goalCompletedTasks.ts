import { api } from '@/lib/network';
import { GetLifeArea } from '@/screens/common';

import type { Task } from '../NewTask/data';
import type { Goal } from './data';

export type GoalCompletedTaskRow = {
  name: string;
  timesDone: number;
  points: number;
};

const PAGE_SIZE = 5;

export { PAGE_SIZE as GOAL_COMPLETED_TASKS_PAGE_SIZE };

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeTask(raw: Task & { _id?: string }): Task {
  return {
    ...raw,
    // eslint-disable-next-line no-underscore-dangle -- campo `_id` retornado pela API MongoDB
    id: raw.id ?? raw._id ?? '',
  };
}

function normalizeTasksResponse(response: unknown): Task[] {
  if (Array.isArray(response)) {
    return response.map((task) => normalizeTask(task as Task & { _id?: string }));
  }

  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    const merged = [obj.visibleTasks, obj.concludedTasks, obj.tasks].flatMap((chunk) => (Array.isArray(chunk) ? chunk : []));

    if (merged.length > 0) {
      return merged.map((task) => normalizeTask(task as Task & { _id?: string }));
    }
  }

  return [];
}

/** Pontuação por conclusão: energia + impacto (0–10). */
export function computeTaskCompletionScore(task: Pick<Task, 'energy' | 'impact'>): number {
  return (task.energy ?? 0) + (task.impact ?? 0);
}

export function getGoalMatchKeys(goal: Goal): string[] {
  const area = GetLifeArea(goal.areaId);
  const keys = new Set<string>();

  if (goal.areaId.trim()) keys.add(normalizeKey(goal.areaId));
  if (area.label.trim()) keys.add(normalizeKey(area.label));
  if (goal.name.trim()) keys.add(normalizeKey(goal.name));

  return [...keys];
}

export function taskBelongsToGoal(task: Pick<Task, 'goal'>, goal: Goal): boolean {
  const taskKey = normalizeKey(task.goal.name);
  return getGoalMatchKeys(goal).some((key) => key === taskKey);
}

export function aggregateCompletedTasks(tasks: Task[]): GoalCompletedTaskRow[] {
  const rows = new Map<string, GoalCompletedTaskRow & { lastCompletedMs: number }>();

  for (const task of tasks) {
    const completions = task.completed ?? [];
    if (completions.length > 0) {
      const perCompletion = computeTaskCompletionScore(task);
      const name = task.name.trim() || 'Sem nome';
      const key = normalizeKey(name);

      const lastCompletedMs = completions.reduce((max, iso) => {
        const ms = new Date(iso).getTime();
        return Number.isFinite(ms) && ms > max ? ms : max;
      }, 0);

      const existing = rows.get(key);
      if (existing) {
        existing.timesDone += completions.length;
        existing.points += perCompletion * completions.length;
        existing.lastCompletedMs = Math.max(existing.lastCompletedMs, lastCompletedMs);
      } else {
        rows.set(key, {
          name,
          timesDone: completions.length,
          points: perCompletion * completions.length,
          lastCompletedMs,
        });
      }
    }
  }

  return Array.from(rows.values())
    .sort((a, b) => {
      const aRepeated = a.timesDone > 1 ? 1 : 0;
      const bRepeated = b.timesDone > 1 ? 1 : 0;
      if (aRepeated !== bRepeated) return bRepeated - aRepeated;

      if (a.timesDone !== b.timesDone) return b.timesDone - a.timesDone;

      return b.lastCompletedMs - a.lastCompletedMs;
    })
    .map(({ lastCompletedMs: _lastCompletedMs, ...row }) => row);
}

export function paginateRows<T>(rows: T[], page: number, pageSize = PAGE_SIZE): { pageRows: T[]; totalPages: number; safePage: number } {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const start = safePage * pageSize;

  return {
    pageRows: rows.slice(start, start + pageSize),
    totalPages,
    safePage,
  };
}

export async function fetchTasksForGoal(goal: Goal): Promise<Task[]> {
  const deduped = new Map<string, Task>();

  const addTasks = (tasks: Task[]) => {
    for (const task of tasks) {
      if (taskBelongsToGoal(task, goal) && task.id) {
        deduped.set(task.id, task);
      }
    }
  };

  try {
    const byArea = await api.get<unknown>('/tasks', { params: { area: goal.areaId } });
    addTasks(normalizeTasksResponse(byArea));
  } catch {
    // segue para fallback
  }

  if (deduped.size === 0) {
    try {
      const all = await api.get<unknown>('/tasks');
      addTasks(normalizeTasksResponse(all));
    } catch {
      return [];
    }
  }

  return Array.from(deduped.values());
}
