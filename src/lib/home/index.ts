/**
 * # Payload agregado da Home
 *
 * A abertura do app disparava cerca de doze requisições — duas de tarefas, sete
 * da semana para os lembretes, assinatura, perfil de sono e sugestões do coach.
 * Todas liam a mesma coleção no servidor, e em paralelo elas abriam várias
 * instâncias serverless frias de uma vez, cada uma pagando o custo de conectar
 * ao banco. `GET /home` resolve tudo numa requisição só.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { FetchRankingResult } from '@/lib/coach';
import { api } from '@/lib/network';
import { queryKeys } from '@/lib/query';
import type { SleepProfileData } from '@/lib/sleepProfile/apply';
import type { SubscriptionStatus } from '@/lib/subscription/types';
import type { Task } from '@/screens/NewTask/data';

import { setHomeSnapshot } from './snapshot';

export { clearHomeSnapshot, takeSleepProfileSnapshot, takeSubscriptionSnapshot } from './snapshot';

/** Mesmo shape de `POST /ai/coach-suggestions`, para semear a query do coach. */
export type HomeCoach = FetchRankingResult;

export type HomeWeek = {
  /** Tarefas visíveis por dia civil (`YYYY-MM-DD`). */
  byDate: Record<string, Task[]>;
  tomorrowKey: string;
};

export type HomeData = {
  today: { visibleTasks: Task[]; concludedTasks: Task[] };
  week: HomeWeek;
  nodateTasks: Task[];
  subscription: SubscriptionStatus | null;
  sleepProfile: SleepProfileData | null;
  coach: HomeCoach | null;
};

/** Acrescenta `id` e uma chave estável para o React reconciliar as listas. */
function organizeTasks(tasks: unknown): Task[] {
  if (!Array.isArray(tasks)) return [];

  return tasks.map((task, index) => {
    const item = task as Task & { _id?: string };
    // eslint-disable-next-line no-underscore-dangle -- campo `_id` retornado pela API MongoDB
    const id = item.id ?? item._id ?? '';
    return { ...item, id, randomId: `${id || 'task'}-${index}` };
  });
}

/**
 * Resolve uma lista de posições no pool de tarefas.
 *
 * O servidor manda cada tarefa uma vez e referencia por índice: as mesmas
 * tarefas caem em vários recortes, e repetir os documentos inteiros dobrava o
 * tamanho da resposta.
 */
function pick(pool: Task[], indexes: unknown): Task[] {
  if (!Array.isArray(indexes)) return [];
  return indexes.map((index) => pool[index as number]).filter((task): task is Task => Boolean(task));
}

export async function fetchHome(dateISO: string, energyLevel: number): Promise<HomeData> {
  const response = await api.get<any>('/home', { params: { date: dateISO, energyLevel } });
  const pool = organizeTasks(response?.tasks);

  const byDate: Record<string, Task[]> = {};
  for (const [dayKey, indexes] of Object.entries(response?.week?.byDate ?? {})) {
    byDate[dayKey] = pick(pool, indexes);
  }

  const data: HomeData = {
    today: {
      visibleTasks: pick(pool, response?.today?.visible),
      concludedTasks: pick(pool, response?.today?.concluded),
    },
    week: { byDate, tomorrowKey: response?.week?.tomorrowKey ?? '' },
    nodateTasks: pick(pool, response?.nodate),
    subscription: response?.subscription ?? null,
    sleepProfile: response?.sleepProfile ?? null,
    coach: response?.coach ?? null,
  };

  setHomeSnapshot({ subscription: data.subscription, sleepProfile: data.sleepProfile });

  return data;
}

export function useHome(dateISO: string, energyLevel: number, enabled = true): UseQueryResult<HomeData> {
  return useQuery<HomeData>({
    queryKey: queryKeys.home(dateISO.split('T')[0] ?? dateISO, energyLevel),
    queryFn: () => fetchHome(dateISO, energyLevel),
    enabled,
    // Ao mudar de nível de energia a chave muda, mas a lista anterior continua
    // na tela enquanto a nova ordem chega — sem voltar para o spinner.
    placeholderData: (previous) => previous,
  });
}

/** Tarefas visíveis de um dia específico da semana. */
export function tasksForDay(week: HomeWeek | undefined, dayKey: string): Task[] {
  return week?.byDate[dayKey] ?? [];
}

/** Todas as tarefas visíveis da semana, sem repetição entre os dias. */
export function weekTasks(week: HomeWeek | undefined): Task[] {
  if (!week) return [];

  const byId = new Map<string, Task>();
  for (const tasks of Object.values(week.byDate)) {
    for (const task of tasks) {
      if (!byId.has(task.id)) byId.set(task.id, task);
    }
  }
  return Array.from(byId.values());
}
