/**
 * Sincronização Google Calendar -> Flowly.
 *
 * Função pura quanto a storage: recebe o token e o mapa de dedupe atual, busca
 * os eventos, cria as tarefas ausentes via `PUT /tasks` e devolve o resultado
 * com o mapa atualizado. A persistência do mapa fica a cargo do chamador.
 */

import { api } from '@/lib/network';
import type { NewTaskPayload } from '@/screens/NewTask/data';

import { defaultEventWindow, type EventWindow, listUpcomingEvents } from './events';
import { eventToTaskPayload } from './mapping';
import type { GoogleCalendarEvent, SyncResult } from './types';

type SyncOptions = {
  token: string;
  /** Mapa `eventId -> taskId` já importado (dedupe). */
  existingMap?: Record<string, string>;
  /** Janela de busca. Default: agora -> +30 dias. */
  window?: EventWindow;
};

/** Extrai o id da tarefa criada a partir da resposta do `PUT /tasks`. */
function extractTaskId(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null;
  const record = response as { id?: unknown; _id?: unknown };
  if (typeof record.id === 'string') return record.id;
  // eslint-disable-next-line no-underscore-dangle -- `_id` retornado pela API MongoDB
  if (typeof record._id === 'string') return record._id;
  return null;
}

/**
 * Importa os eventos do Google Calendar como tarefas do Flowly.
 *
 * Eventos sem horário (dia inteiro) e os já importados (presentes em
 * `existingMap`) são ignorados.
 */
export async function syncEventsToTasks({ token, existingMap = {}, window }: SyncOptions): Promise<SyncResult> {
  const events = await listUpcomingEvents(token, window ?? defaultEventWindow());

  const map: Record<string, string> = { ...existingMap };

  // Novos eventos com horário definido viram tarefas; os demais são ignorados.
  const creatable: Array<{ event: GoogleCalendarEvent; payload: NewTaskPayload }> = [];
  for (const event of events) {
    if (map[event.id]) continue; // eslint-disable-line no-continue -- dedupe direto
    const payload = eventToTaskPayload(event);
    if (payload) creatable.push({ event, payload });
  }

  const skipped = events.length - creatable.length;

  const outcomes = await Promise.allSettled(
    creatable.map(async ({ event, payload }) => {
      const response = await api.put('/tasks', payload);
      return { eventId: event.id, taskId: extractTaskId(response) ?? event.id };
    }),
  );

  let created = 0;
  let failed = 0;
  for (const outcome of outcomes) {
    if (outcome.status === 'fulfilled') {
      map[outcome.value.eventId] = outcome.value.taskId;
      created += 1;
    } else {
      failed += 1;
    }
  }

  return { created, skipped, failed, map };
}
