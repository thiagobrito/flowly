/**
 * Constantes e configuração de runtime da lib de storage.
 *
 * A configuração (backend, telemetria, limites e trimmers) é mutável e global,
 * no mesmo espírito do `configureApi` da lib de network: defina-a uma vez no
 * boot do app e todos os `usePersistedState` passam a usá-la.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { StorageBackend, StorageConfig, StorageTelemetry, Trimmer } from './types';

/** Tamanho máximo (bytes) do payload serializado antes de aplicar trimming. */
export const MAX_PERSISTED_STATE_SIZE_BYTES = 256 * 1024;

/** Tamanho (bytes) a partir do qual um aviso de payload grande é emitido. */
export const WARNING_SIZE_BYTES = 128 * 1024;

/** Timeout (ms) da hidratação inicial a partir do backend. */
export const HYDRATION_TIMEOUT_MS = 5000;

/** Chave padrão usada quando nenhuma é informada para `usePersistedState`. */
export const DEFAULT_STORAGE_KEY = 'storage_v1';

/** Backend default: `@react-native-async-storage/async-storage`. */
const asyncStorageBackend: StorageBackend = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};

/** Telemetria default: no-op (nenhum evento é reportado). */
const noopTelemetry: StorageTelemetry = {
  addBreadcrumb: () => undefined,
  reportMessage: () => undefined,
};

interface RuntimeConfig {
  backend: StorageBackend;
  telemetry: StorageTelemetry;
  maxSizeBytes: number;
  warnSizeBytes: number;
  hydrationTimeoutMs: number;
}

const defaultRuntime = (): RuntimeConfig => ({
  backend: asyncStorageBackend,
  telemetry: noopTelemetry,
  maxSizeBytes: MAX_PERSISTED_STATE_SIZE_BYTES,
  warnSizeBytes: WARNING_SIZE_BYTES,
  hydrationTimeoutMs: HYDRATION_TIMEOUT_MS,
});

let runtime: RuntimeConfig = defaultRuntime();

const trimmers = new Map<string, Trimmer>();

/**
 * Reconfigura a lib de storage. Faz merge superficial: campos omitidos mantêm
 * o valor atual. Chame uma vez no boot (ex.: para conectar a telemetria ao
 * Sentry ou trocar o backend em testes).
 */
export function configureStorage(config: StorageConfig): void {
  runtime = {
    backend: config.backend ?? runtime.backend,
    telemetry: config.telemetry ?? runtime.telemetry,
    maxSizeBytes: config.maxSizeBytes ?? runtime.maxSizeBytes,
    warnSizeBytes: config.warnSizeBytes ?? runtime.warnSizeBytes,
    hydrationTimeoutMs: config.hydrationTimeoutMs ?? runtime.hydrationTimeoutMs,
  };
}

/**
 * Registra um `Trimmer` para uma chave. Quando o payload daquela chave excede
 * `maxSizeBytes`, o trimmer é aplicado antes de tentar persistir novamente.
 */
export function registerTrimmer(key: string, trimmer: Trimmer): void {
  trimmers.set(key, trimmer);
}

/** Remove o trimmer registrado para uma chave (se houver). */
export function unregisterTrimmer(key: string): void {
  trimmers.delete(key);
}

/** Backend efetivo (uso interno). */
export function getBackend(): StorageBackend {
  return runtime.backend;
}

/** Telemetria efetiva (uso interno). */
export function getTelemetry(): StorageTelemetry {
  return runtime.telemetry;
}

/** Trimmer registrado para a chave, se houver (uso interno). */
export function getTrimmer(key: string): Trimmer | undefined {
  return trimmers.get(key);
}

/** Limites efetivos de tamanho/timeout (uso interno). */
export function getLimits(): Pick<RuntimeConfig, 'maxSizeBytes' | 'warnSizeBytes' | 'hydrationTimeoutMs'> {
  return {
    maxSizeBytes: runtime.maxSizeBytes,
    warnSizeBytes: runtime.warnSizeBytes,
    hydrationTimeoutMs: runtime.hydrationTimeoutMs,
  };
}

/** Restaura a configuração e os trimmers para o estado default. Útil em testes. */
export function resetStorageConfigForTests(): void {
  runtime = defaultRuntime();
  trimmers.clear();
}
