/* eslint-disable no-param-reassign -- a CacheEntry é um objeto mutável compartilhado por design (cache em memória por chave) */

/**
 * Cache em memória por chave que coordena hidratação, fila de escrita e
 * notificação de listeners entre múltiplas instâncias de `usePersistedState`
 * que compartilham a mesma chave.
 */

import { getBackend, getLimits, getTelemetry } from './config';
import { deepClone, getFallbackState, getStringSizeInBytes } from './helpers';
import type { PersistedRecord } from './types';

/** Listener notificado quando o valor cru de uma chave muda. */
export type CacheListener = (rawValue: unknown) => void;

/** Estado em memória associado a uma chave de storage. */
export interface CacheEntry {
  hydrated: boolean;
  hydrationPromise: Promise<unknown> | null;
  /** `undefined` = ainda não hidratado; qualquer outro valor = hidratado. */
  cachedRawValue: unknown;
  listeners: Set<CacheListener>;
  writing: boolean;
  writeQueue: Array<() => Promise<unknown>>;
  pendingWrites: number;
  /** Incrementado ao agendar InteractionManager; evita eviction antes do setItem (ex.: logout + replace). */
  scheduledAsyncPersistence: number;
  version: number;
}

const persistedStorageCache = new Map<string, CacheEntry>();

/** Remove a entrada do cache quando não há mais nada pendente nem em uso. */
export function maybeEvictCacheEntry(key: string, entry: CacheEntry): void {
  if (!entry) return;
  const scheduledAsync = typeof entry.scheduledAsyncPersistence === 'number' ? entry.scheduledAsyncPersistence : 0;
  if (entry.listeners.size === 0 && !entry.hydrationPromise && !entry.writing && entry.pendingWrites === 0 && entry.writeQueue.length === 0 && scheduledAsync === 0) {
    persistedStorageCache.delete(key);
  }
}

/** Notifica todos os listeners da entrada, isolando erros de cada um. */
export function publishToListeners(entry: CacheEntry, rawValue: unknown): void {
  entry.listeners.forEach((listener) => {
    try {
      listener(rawValue);
    } catch (error) {
      console.error('usePersistedState: erro ao notificar listeners', error);
    }
  });
}

/**
 * Lê de forma **síncrona** o último valor cru em cache para a chave, sem
 * disparar hidratação. Retorna `undefined` quando a chave ainda não foi
 * hidratada (ou não existe no cache).
 */
export function getCachedRawValue(key: string): unknown {
  return persistedStorageCache.get(key)?.cachedRawValue;
}

/** Retorna (criando se necessário) a entrada de cache para a chave. */
export function getCacheEntry(key: string): CacheEntry {
  let entry = persistedStorageCache.get(key);
  if (!entry) {
    entry = {
      hydrated: false,
      hydrationPromise: null,
      cachedRawValue: undefined,
      listeners: new Set<CacheListener>(),
      writing: false,
      writeQueue: [],
      pendingWrites: 0,
      scheduledAsyncPersistence: 0,
      version: 0,
    };
    persistedStorageCache.set(key, entry);
  }
  return entry;
}

/** Enfileira uma escrita garantindo execução serial por chave (FIFO). */
export function enqueueWrite(entry: CacheEntry, key: string, task: () => Promise<unknown>): void {
  entry.writeQueue.push(task);
  if (entry.writing) return;

  entry.writing = true;
  const runNext = (): void => {
    const nextTask = entry.writeQueue.shift();
    if (!nextTask) {
      entry.writing = false;
      maybeEvictCacheEntry(key, entry);
      return;
    }
    nextTask().finally(runNext);
  };

  runNext();
}

/**
 * Garante (uma única vez) a hidratação da chave a partir do backend, com
 * timeout. Concorrentes compartilham a mesma promise. Em timeout, publica um
 * fallback marcado com `hydrationTimedOut` para os listeners.
 */
export function ensureHydrated(entry: CacheEntry, key: string, caller: string): Promise<unknown> {
  if (entry.hydrated) {
    return Promise.resolve(entry.cachedRawValue);
  }
  if (entry.hydrationPromise) {
    return entry.hydrationPromise;
  }

  const backend = getBackend();
  const telemetry = getTelemetry();
  const { hydrationTimeoutMs } = getLimits();

  const startAt = Date.now();
  const versionAtStart = entry.version;
  telemetry.addBreadcrumb('AsyncStorage.getItem.start', { key, caller }, 'native-storage');

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error('hydration_timeout')), hydrationTimeoutMs);
  });

  entry.hydrationPromise = Promise.race([backend.getItem(key), timeoutPromise])
    .then((value) => {
      const durationMs = Date.now() - startAt;
      const sizeBytes = getStringSizeInBytes(value ?? '');
      let parsed: unknown = null;
      let status = value ? 'hit' : 'miss';

      if (value) {
        try {
          parsed = JSON.parse(value);
        } catch (error) {
          status = 'parse_error';
          console.error('storage: JSON parse error, resetting to initial', error);
        }
      }

      if (entry.version === versionAtStart && entry.cachedRawValue === undefined) {
        entry.cachedRawValue = parsed;
      }
      entry.hydrated = true;
      telemetry.addBreadcrumb('AsyncStorage.getItem.success', { key, caller, durationMs, sizeBytes, status }, 'native-storage');

      return entry.cachedRawValue === undefined ? parsed : entry.cachedRawValue;
    })
    .catch((error) => {
      const durationMs = Date.now() - startAt;
      const timedOut = error instanceof Error && error.message === 'hydration_timeout';
      telemetry.addBreadcrumb(
        'AsyncStorage.getItem.error',
        {
          key,
          caller,
          durationMs,
          timedOut,
          message: error instanceof Error ? error.message : String(error),
        },
        'native-storage',
      );

      if (timedOut) {
        telemetry.reportMessage('hydration_timeout', {
          tags: { action: 'hydration_timeout' },
          extra: { key },
        });
      } else {
        console.error('usePersistedState: erro ao ler storage', error);
      }

      if (entry.version === versionAtStart && entry.cachedRawValue === undefined) {
        entry.cachedRawValue = null;
      }
      entry.hydrated = true;

      if (timedOut) {
        const timeoutFallback = deepClone(getFallbackState({})) as PersistedRecord;
        timeoutFallback.hydrationTimedOut = true;
        timeoutFallback.loaded = false;
        entry.cachedRawValue = timeoutFallback;
        publishToListeners(entry, entry.cachedRawValue);
      }

      return entry.cachedRawValue;
    })
    .finally(() => {
      if (timeoutId != null) clearTimeout(timeoutId);
      entry.hydrationPromise = null;
      maybeEvictCacheEntry(key, entry);
    });

  return entry.hydrationPromise;
}

/** Limpa todo o cache em memória. Útil em testes. */
export function resetPersistedStateCacheForTests(): void {
  persistedStorageCache.clear();
}
