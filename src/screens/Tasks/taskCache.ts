import type { Task } from '../NewTask/data';

/** Formato dos dados de tarefas do dia no cache do React Query. */
export type TasksData = {
  visibleTasks: Task[];
  concludedTasks: Task[];
};

const EMPTY: TasksData = { visibleTasks: [], concludedTasks: [] };

/** Remove uma tarefa das duas listas (usado no delete otimista). */
export function removeTaskFromLists(data: TasksData | undefined, taskId: string): TasksData {
  const base = data ?? EMPTY;
  return {
    visibleTasks: base.visibleTasks.filter((task) => task.id !== taskId),
    concludedTasks: base.concludedTasks.filter((task) => task.id !== taskId),
  };
}

/**
 * Move uma tarefa entre "a fazer" e "concluídas" de forma otimista, sem esperar
 * o refetch. A reordenação/priorização definitiva vem da revalidação posterior.
 */
export function moveTask(data: TasksData | undefined, taskId: string, toConcluded: boolean): TasksData {
  const base = data ?? EMPTY;
  const source = toConcluded ? base.visibleTasks : base.concludedTasks;
  const target = toConcluded ? base.concludedTasks : base.visibleTasks;

  const task = source.find((item) => item.id === taskId);
  if (!task) return base;

  const nextSource = source.filter((item) => item.id !== taskId);
  const nextTarget = [task, ...target.filter((item) => item.id !== taskId)];

  return toConcluded ? { visibleTasks: nextSource, concludedTasks: nextTarget } : { visibleTasks: nextTarget, concludedTasks: nextSource };
}
