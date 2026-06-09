/**
 * Tipos públicos da lib de storage.
 *
 * Mantidos isolados da implementação para que callers possam importar apenas os
 * contratos (ex.: para tipar um `StorageBackend` ou `StorageTelemetry` próprio)
 * sem puxar o hook nem o cache.
 */

/** Objeto persistível arbitrário (mapa de `string` para valor serializável). */
export type PersistedRecord = Record<string, unknown>;

/**
 * Valor persistível por `usePersistedState`: um objeto (record) ou um array.
 * Primitivos não são suportados — a persistência sempre trabalha com JSON de
 * objetos/arrays.
 */
export type PersistedValue = PersistedRecord | unknown[];

/**
 * Backend de persistência key/value assíncrono.
 *
 * A implementação default usa `@react-native-async-storage/async-storage`, mas
 * pode ser trocada via `configureStorage` (ex.: storage seguro, memória em
 * testes, MMKV).
 */
export interface StorageBackend {
  /** Lê o valor cru (string JSON) de uma chave. Retorna `null` quando ausente. */
  getItem(key: string): Promise<string | null>;
  /** Grava o valor cru (string JSON) em uma chave. */
  setItem(key: string, value: string): Promise<void>;
}

/** Contexto adicional reportado junto de uma mensagem de telemetria. */
export interface TelemetryContext {
  tags?: Record<string, unknown>;
  extra?: Record<string, unknown>;
}

/**
 * Coletor de telemetria opcional (breadcrumbs + mensagens).
 *
 * O default é no-op. Conecte ao Sentry (ou outro provedor) via
 * `configureStorage({ telemetry })` para instrumentar leituras/escritas e
 * timeouts de hidratação.
 */
export interface StorageTelemetry {
  /** Registra um evento de baixo nível (ex.: início/fim de uma chamada nativa). */
  addBreadcrumb(message: string, data?: Record<string, unknown>, category?: string): void;
  /** Reporta uma mensagem relevante (ex.: timeout de hidratação). */
  reportMessage(message: string, context?: TelemetryContext): void;
}

/**
 * Reduz o tamanho de um payload grande demais antes de persistir.
 *
 * Registrado por chave via `registerTrimmer`. Recebe o valor (já clonado) e
 * deve devolver uma versão menor — a lib é genérica e não conhece o formato
 * dos dados de domínio, por isso o trimming é injetado pelo app.
 */
export type Trimmer = (value: PersistedValue) => PersistedValue;

/** Opções aceitas por `configureStorage`. Campos omitidos preservam o atual. */
export interface StorageConfig {
  /** Backend de persistência. Default: AsyncStorage. */
  backend?: StorageBackend;
  /** Coletor de telemetria. Default: no-op. */
  telemetry?: StorageTelemetry;
  /** Tamanho máximo (bytes) do payload serializado antes de aplicar trimming. */
  maxSizeBytes?: number;
  /** Tamanho (bytes) que dispara um aviso de payload grande. */
  warnSizeBytes?: number;
  /** Timeout (ms) da hidratação inicial a partir do backend. */
  hydrationTimeoutMs?: number;
}

/** Função de escrita retornada por `usePersistedState`. */
export type SetPersisted<T extends PersistedValue> = (value: T, force?: boolean, trace?: string | null) => void;

/**
 * Retorno de `usePersistedState`: `[estado, setter, lastUpdate]`.
 * `lastUpdate` é o ISO timestamp da última escrita local (ou `null`).
 */
export type UsePersistedStateResult<T extends PersistedValue> = [T, SetPersisted<T>, string | null];
