/**
 * # Storage library
 *
 * Estado React persistido em um backend key/value (AsyncStorage por padrão).
 * Centraliza hidratação, cache em memória compartilhado por chave, escrita
 * serial fora do frame de interação, telemetria opcional e trimming de
 * payloads grandes.
 *
 * ## Uso rápido
 *
 * ```tsx
 * import { usePersistedState } from '@/lib/storage';
 *
 * function Profile() {
 *   const [profile, setProfile] = usePersistedState({ name: '' }, 'storage_v1');
 *
 *   if (!profile.loaded) return <Text>Carregando...</Text>;
 *
 *   return <Button title="Salvar" onPress={() => setProfile({ ...profile, name: 'Ana' })} />;
 * }
 * ```
 *
 * O retorno é `[state, setPersisted, lastUpdate]`. Objetos hidratados ganham
 * `loaded: true` e `lastUpdate` (ISO). Arrays são preservados como estão.
 *
 * ## Configuração (uma vez, no boot)
 *
 * ```ts
 * import { configureStorage } from '@/lib/storage';
 * import { addBreadcrumb, reportMessage } from '@/lib/sentry';
 *
 * configureStorage({
 *   telemetry: { addBreadcrumb, reportMessage }, // opcional (default: no-op)
 *   maxSizeBytes: 256 * 1024,                    // opcional
 * });
 * ```
 *
 * O backend default é `@react-native-async-storage/async-storage`. Para trocar
 * (ex.: testes em memória, storage seguro), passe `backend` em `configureStorage`.
 *
 * ## Trimming de payloads grandes
 *
 * A lib é genérica e não conhece o formato dos seus dados. Registre um trimmer
 * por chave; ele só roda quando o payload excede `maxSizeBytes`:
 *
 * ```ts
 * import { registerTrimmer, trimNutritionData, trimProfileData } from '@/lib/storage';
 *
 * registerTrimmer('nutrition_v2', trimNutritionData);
 * registerTrimmer('storage_v1', trimProfileData);
 * ```
 *
 * ## Exports principais
 *
 * - `usePersistedState` — hook de estado persistido
 * - `configureStorage` — backend, telemetria e limites
 * - `registerTrimmer` / `unregisterTrimmer` — trimming por chave
 * - `trimNutritionData` / `trimProfileData` — trimmers prontos (opt-in)
 * - Tipos: `PersistedValue`, `StorageBackend`, `StorageTelemetry`, `Trimmer`, etc.
 */

import { getCachedRawValue } from './cache';
import { toHydratedState } from './helpers';
import type { PersistedValue } from './types';

/**
 * Lê de forma **síncrona** o estado persistido atual de uma chave, a partir do
 * cache em memória (sem disparar hidratação nem tocar o backend async).
 *
 * Útil fora do ciclo de render do React — por exemplo, para resolver o token de
 * auth no momento exato de uma requisição, sem depender da ordem dos `useEffect`.
 * Retorna o `initial` hidratado quando a chave ainda não foi carregada.
 */
export function getPersistedSnapshot<T extends PersistedValue>(initial: T, key: string): T {
  return toHydratedState(initial, getCachedRawValue(key)) as T;
}

export { resetPersistedStateCacheForTests } from './cache';
export { configureStorage, DEFAULT_STORAGE_KEY, HYDRATION_TIMEOUT_MS, MAX_PERSISTED_STATE_SIZE_BYTES, registerTrimmer, resetStorageConfigForTests, unregisterTrimmer, WARNING_SIZE_BYTES } from './config';
export { trimNutritionData, trimProfileData } from './trimmers';
export type { PersistedRecord, PersistedValue, SetPersisted, StorageBackend, StorageConfig, StorageTelemetry, TelemetryContext, Trimmer, UsePersistedStateResult } from './types';
export { usePersistedState } from './usePersistedState';
