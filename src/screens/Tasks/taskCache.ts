import type { HomeData } from '@/lib/home';

import type { Task } from '../NewTask/data';
import { classifyOpenTask } from './taskDateFilter';

/** Formato dos dados de tarefas do dia no cache do React Query. */
export type TasksData = {
  visibleTasks: Task[];
  concludedTasks: Task[];
};

function withoutTask(tasks: Task[], taskId: string): Task[] {
  return tasks.filter((task) => task.id !== taskId);
}

/** Remove a tarefa de todas as listas da Home (delete otimista). */
export function removeTaskFromHome(data: HomeData | undefined, taskId: string): HomeData | undefined {
  if (!data) return data;
  return {
    ...data,
    today: {
      visibleTasks: withoutTask(data.today.visibleTasks, taskId),
      concludedTasks: withoutTask(data.today.concludedTasks, taskId),
    },
    overdueTasks: withoutTask(data.overdueTasks ?? [], taskId),
    nodateTasks: withoutTask(data.nodateTasks ?? [], taskId),
  };
}

/**
 * Move a tarefa entre pendentes e concluídas nas três listas, sem esperar o
 * refetch. A classificação definitiva volta com a revalidação.
 */
export function toggleTaskOnHome(data: HomeData | undefined, taskId: string, nowConcluded: boolean, todayKey: string): HomeData | undefined {
  if (!data) return data;

  const pending = [...data.today.visibleTasks, ...(data.overdueTasks ?? []), ...(data.nodateTasks ?? [])];
  const source = nowConcluded ? pending : data.today.concludedTasks;
  const task = source.find((item) => item.id === taskId);
  if (!task) return data;

  if (nowConcluded) {
    return {
      ...data,
      today: {
        visibleTasks: withoutTask(data.today.visibleTasks, taskId),
        concludedTasks: [task, ...withoutTask(data.today.concludedTasks, taskId)],
      },
      overdueTasks: withoutTask(data.overdueTasks ?? [], taskId),
      nodateTasks: withoutTask(data.nodateTasks ?? [], taskId),
    };
  }

  const bucket = classifyOpenTask(task, todayKey);
  return {
    ...data,
    today: {
      visibleTasks: bucket === 'today' ? [task, ...withoutTask(data.today.visibleTasks, taskId)] : withoutTask(data.today.visibleTasks, taskId),
      concludedTasks: withoutTask(data.today.concludedTasks, taskId),
    },
    overdueTasks: bucket === 'overdue' ? [task, ...withoutTask(data.overdueTasks ?? [], taskId)] : withoutTask(data.overdueTasks ?? [], taskId),
    nodateTasks: bucket === 'nodate' ? [task, ...withoutTask(data.nodateTasks ?? [], taskId)] : withoutTask(data.nodateTasks ?? [], taskId),
  };
}
