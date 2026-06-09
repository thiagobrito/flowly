/**
 * Hook de estado persistido: espelha um estado React em um backend key/value
 * (AsyncStorage por padrão), com cache em memória compartilhado por chave,
 * escrita serial fora do frame de interação e trimming opcional de payloads
 * grandes.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

import { enqueueWrite, ensureHydrated, getCacheEntry, maybeEvictCacheEntry, publishToListeners } from './cache';
import { DEFAULT_STORAGE_KEY, getBackend, getLimits, getTelemetry, getTrimmer } from './config';
import { cloneRawValue, deepClone, getCallerLabel, getStringSizeInBytes, toHydratedState } from './helpers';
import type { PersistedValue, SetPersisted, UsePersistedStateResult } from './types';

/**
 * Persiste e hidrata um estado a partir do backend configurado.
 *
 * @param initial Estado inicial (objeto ou array). Define o "shape" esperado.
 * @param key Chave de storage. Default: `DEFAULT_STORAGE_KEY` (`storage_v1`).
 * @returns `[state, setPersisted, lastUpdate]`.
 */
export function usePersistedState<T extends PersistedValue>(initial: T, key: string = DEFAULT_STORAGE_KEY): UsePersistedStateResult<T> {
  const [state, setState] = useState<T>(initial);
  const lastUpdate = useRef<string | null>(null);
  const initialRef = useRef<T>(initial);

  useEffect(() => {
    let cancelled = false;
    const caller = getCallerLabel('usePersistedState_hydration');
    const entry = getCacheEntry(key);

    const applyRawValue = (rawValue: unknown): void => {
      if (cancelled) return;
      setState(toHydratedState(initialRef.current, rawValue) as T);
    };

    const listener = (rawValue: unknown): void => {
      applyRawValue(rawValue);
    };
    entry.listeners.add(listener);

    ensureHydrated(entry, key, caller).then((rawValue) => {
      if (cancelled) return;
      applyRawValue(rawValue);
    });

    return () => {
      cancelled = true;
      entry.listeners.delete(listener);
      maybeEvictCacheEntry(key, entry);
    };
  }, [key]);

  const setPersisted = useCallback<SetPersisted<T>>(
    (value, _force = false, trace = null) => {
      if (value === null || value === undefined || typeof value !== 'object') {
        console.log('setPersisted:error - value is null, undefined or not an object', value);
        return;
      }

      let newValue: PersistedValue;
      try {
        newValue = deepClone(value);
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('circular')) {
          InteractionManager.runAfterInteractions(() => {
            console.error(`[${trace ?? ''}]: usePersistedState: erro ao serializar após interações`, error);
          });
          return;
        }
        console.error(`[${trace ?? ''}]: usePersistedState: erro ao salvar storage`, error);
        return;
      }

      try {
        if (!Array.isArray(newValue)) {
          newValue.loaded = true;
          newValue.lastUpdate = new Date().toISOString();
        }
        lastUpdate.current = new Date().toISOString();

        const entry = getCacheEntry(key);
        entry.version += 1;
        entry.hydrated = true;
        entry.cachedRawValue = cloneRawValue(newValue);
        publishToListeners(entry, entry.cachedRawValue);

        const telemetry = getTelemetry();
        const backend = getBackend();
        const { maxSizeBytes, warnSizeBytes } = getLimits();

        entry.scheduledAsyncPersistence += 1;
        InteractionManager.runAfterInteractions(() => {
          try {
            let serializedValue = JSON.stringify(newValue);
            let serializedSizeInBytes = getStringSizeInBytes(serializedValue);

            if (serializedSizeInBytes > maxSizeBytes) {
              console.warn(`usePersistedState: payload muito grande (${serializedSizeInBytes} bytes) para a chave "${key}". Aplicando trimming...`);

              const trimmer = getTrimmer(key);
              if (trimmer) {
                newValue = trimmer(newValue);
              }

              serializedValue = JSON.stringify(newValue);
              serializedSizeInBytes = getStringSizeInBytes(serializedValue);

              if (serializedSizeInBytes > maxSizeBytes) {
                console.error(`usePersistedState: payload ainda muito grande após trimming (${serializedSizeInBytes} bytes) para a chave "${key}". Não salvando.`);
                return;
              }
            } else if (serializedSizeInBytes > warnSizeBytes) {
              console.warn(`usePersistedState: payload grande detectado (${serializedSizeInBytes} bytes) para a chave "${key}".`);
            }

            const caller = trace || getCallerLabel('usePersistedState_write');
            entry.pendingWrites += 1;

            enqueueWrite(entry, key, () => {
              const writeStartAt = Date.now();
              telemetry.addBreadcrumb('AsyncStorage.setItem.start', { key, caller, sizeBytes: serializedSizeInBytes }, 'native-storage');

              return Promise.resolve(backend.setItem(key, serializedValue))
                .then(() => {
                  const durationMs = Date.now() - writeStartAt;
                  telemetry.addBreadcrumb('AsyncStorage.setItem.success', { key, caller, durationMs, sizeBytes: serializedSizeInBytes }, 'native-storage');
                  console.log(`[${trace ?? ''}]: usePersistedState: valor salvo com sucesso (${serializedSizeInBytes} bytes)`, key);
                })
                .catch((error) => {
                  const durationMs = Date.now() - writeStartAt;
                  telemetry.addBreadcrumb(
                    'AsyncStorage.setItem.error',
                    {
                      key,
                      caller,
                      durationMs,
                      message: error instanceof Error ? error.message : String(error),
                    },
                    'native-storage',
                  );
                  console.error(`[${trace ?? ''}]: usePersistedState: erro ao salvar storage`, error);
                })
                .finally(() => {
                  entry.pendingWrites = Math.max(0, entry.pendingWrites - 1);
                  maybeEvictCacheEntry(key, entry);
                });
            });
          } catch (error) {
            console.error(`[${trace ?? ''}]: usePersistedState: erro ao serializar após interações`, error);
          } finally {
            entry.scheduledAsyncPersistence = Math.max(0, entry.scheduledAsyncPersistence - 1);
            maybeEvictCacheEntry(key, entry);
          }
        });
      } catch (error) {
        console.error(`[${trace ?? ''}]: usePersistedState: erro ao salvar storage`, error);
      }
    },
    [key],
  );

  return [state, setPersisted, lastUpdate.current];
}
