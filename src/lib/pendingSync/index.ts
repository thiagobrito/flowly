/**
 * # Pending sync
 *
 * Fila persistida de escritas que falharam por problema de rede (ex.: metas e
 * atividades criadas no onboarding com conexão instável). Em vez de descartar
 * o trabalho do usuário, a requisição é guardada em storage e reenviada
 * automaticamente quando o app volta a ter oportunidade (montagem da Home,
 * retorno ao foreground).
 *
 * Segue o padrão lib-fina + hook do projeto (como `featureFlags/`): o estado
 * vive em `usePersistedState` e é compartilhado por chave — quem enfileira e
 * quem faz o flush enxergam a mesma fila.
 */

import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { api, isHttpError } from '@/lib/network';
import { usePersistedState } from '@/lib/storage';

/** Métodos suportados pela fila (escritas idempotentes do ponto de vista do app). */
export type PendingMethod = 'POST' | 'PUT';

/** Uma escrita pendente de reenvio ao backend. */
export type PendingRequest = {
  id: string;
  method: PendingMethod;
  path: string;
  payload: unknown;
  createdAt: string;
};

const QUEUE_KEY = 'pending_sync_v1';

/** Evita flushes concorrentes (a fila é compartilhada entre hooks). */
let flushInFlight = false;

/**
 * Erros que não adianta reenviar: respostas 4xx de validação/rejeição.
 * Exceções: 401/403 (sessão pode ser renovada), 408/429 (transitórios).
 */
function isPermanentFailure(error: unknown): boolean {
  if (!isHttpError(error)) return false;
  const { status } = error;
  if (status === 401 || status === 403 || status === 408 || status === 429) return false;
  return status >= 400 && status < 500;
}

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Hook da fila de sincronização pendente.
 *
 * - `enqueue` guarda uma escrita que falhou para reenvio posterior.
 * - `flush` tenta reenviar tudo; remove sucessos e falhas permanentes,
 *   mantém falhas transitórias para a próxima oportunidade.
 */
export function usePendingSync() {
  const [queue, setQueue] = usePersistedState<PendingRequest[]>([], QUEUE_KEY);

  const queueRef = useRef(queue);
  queueRef.current = queue;

  const enqueue = useCallback(
    (method: PendingMethod, path: string, payload: unknown) => {
      const request: PendingRequest = { id: createRequestId(), method, path, payload, createdAt: new Date().toISOString() };
      setQueue([...queueRef.current, request]);
    },
    [setQueue],
  );

  const flush = useCallback(async () => {
    if (flushInFlight) return;
    const snapshot = queueRef.current;
    if (snapshot.length === 0) return;

    flushInFlight = true;
    const resolved = new Set<string>();
    try {
      // Reenvio sequencial de propósito: preserva a ordem das escritas e evita
      // rajadas contra um backend possivelmente instável.
      /* eslint-disable no-await-in-loop */
      for (const request of snapshot) {
        try {
          if (request.method === 'POST') await api.post(request.path, request.payload);
          else await api.put(request.path, request.payload);
          resolved.add(request.id);
        } catch (error) {
          if (isPermanentFailure(error)) resolved.add(request.id);
          // Falha transitória (offline, timeout, 5xx): mantém na fila.
        }
      }
      /* eslint-enable no-await-in-loop */
    } finally {
      flushInFlight = false;
    }

    if (resolved.size > 0) {
      // Filtra sobre o estado mais recente para não perder itens enfileirados
      // durante o flush.
      setQueue(queueRef.current.filter((request) => !resolved.has(request.id)));
    }
  }, [setQueue]);

  return { queue, enqueue, flush };
}

/**
 * Dispara o flush automaticamente: quando a fila hidrata/ganha itens e quando
 * o app volta ao foreground. Monte uma única vez no shell autenticado.
 */
export function usePendingSyncFlush(enabled: boolean) {
  const { queue, flush } = usePendingSync();

  useEffect(() => {
    if (enabled && queue.length > 0) flush();
  }, [enabled, queue.length, flush]);

  useEffect(() => {
    if (!enabled) return undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') flush();
    });
    return () => subscription.remove();
  }, [enabled, flush]);
}
