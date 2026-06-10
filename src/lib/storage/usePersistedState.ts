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
      const telemetry = getTelemetry();

      if (value === null || value === undefined || typeof value !== 'object') {
        telemetry.reportMessage('usePersistedState_invalid_value', {
          extra: { trace, valueType: typeof value },
        });
        return;
      }

      let newValue: PersistedValue;
      try {
        newValue = deepClone(value);
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('circular')) {
          InteractionManager.runAfterInteractions(() => {
            telemetry.reportMessage('usePersistedState_circular_reference', {
              extra: { trace, message: error instanceof Error ? error.message : String(error) },
            });
          });
          return;
        }
        telemetry.reportMessage('usePersistedState_save_error', {
          extra: { trace, message: error instanceof Error ? error.message : String(error) },
        });
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

        const backend = getBackend();
        const { maxSizeBytes, warnSizeBytes } = getLimits();

        entry.scheduledAsyncPersistence += 1;
        InteractionManager.runAfterInteractions(() => {
          try {
            let serializedValue = JSON.stringify(newValue);
            let serializedSizeInBytes = getStringSizeInBytes(serializedValue);

            if (serializedSizeInBytes > maxSizeBytes) {
              telemetry.addBreadcrumb('usePersistedState.payload_too_large', { key, serializedSizeInBytes, action: 'trimming' }, 'native-storage');

              const trimmer = getTrimmer(key);
              if (trimmer) {
                newValue = trimmer(newValue);
              }

              serializedValue = JSON.stringify(newValue);
              serializedSizeInBytes = getStringSizeInBytes(serializedValue);

              if (serializedSizeInBytes > maxSizeBytes) {
                telemetry.reportMessage('usePersistedState_payload_still_too_large', {
                  extra: { key, serializedSizeInBytes },
                });
                return;
              }
            } else if (serializedSizeInBytes > warnSizeBytes) {
              telemetry.addBreadcrumb('usePersistedState.payload_large', { key, serializedSizeInBytes }, 'native-storage');
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
                  telemetry.reportMessage('usePersistedState_write_error', {
                    extra: { trace, key, message: error instanceof Error ? error.message : String(error) },
                  });
                })
                .finally(() => {
                  entry.pendingWrites = Math.max(0, entry.pendingWrites - 1);
                  maybeEvictCacheEntry(key, entry);
                });
            });
          } catch (error) {
            telemetry.reportMessage('usePersistedState_serialize_error', {
              extra: { trace, message: error instanceof Error ? error.message : String(error) },
            });
          } finally {
            entry.scheduledAsyncPersistence = Math.max(0, entry.scheduledAsyncPersistence - 1);
            maybeEvictCacheEntry(key, entry);
          }
        });
      } catch (error) {
        telemetry.reportMessage('usePersistedState_save_error', {
          extra: { trace, message: error instanceof Error ? error.message : String(error) },
        });
      }
    },
    [key],
  );

  return [state, setPersisted, lastUpdate.current];
}
