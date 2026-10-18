/**
 * Escrita de snapshot persistido fora do React.
 *
 * O hook `usePersistedState` já cobre a UI. Auth precisa gravar a sessão no
 * mesmo cache (e avisar os listeners) quando um 401 chega no client HTTP —
 * senão o guard continua vendo o token morto e a tela trava.
 */

import { enqueueWrite, getCacheEntry, publishToListeners } from './cache';
import { getBackend } from './config';
import { cloneRawValue, deepClone } from './helpers';
import type { PersistedRecord, PersistedValue } from './types';

export function writePersistedSnapshot<T extends PersistedValue>(key: string, value: T): void {
  if (value === null || value === undefined || typeof value !== 'object') return;

  const newValue = deepClone(value) as PersistedValue;
  if (!Array.isArray(newValue)) {
    const record = newValue as PersistedRecord;
    record.loaded = true;
    record.lastUpdate = new Date().toISOString();
  }

  const entry = getCacheEntry(key);
  entry.version += 1;
  entry.hydrated = true;
  entry.cachedRawValue = cloneRawValue(newValue);
  publishToListeners(entry, entry.cachedRawValue);

  const serialized = JSON.stringify(newValue);
  enqueueWrite(entry, key, () => Promise.resolve(getBackend().setItem(key, serialized)).catch(() => undefined));
}
