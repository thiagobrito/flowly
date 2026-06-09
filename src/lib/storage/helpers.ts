/**
 * Helpers puros (sem side effects) da lib de storage: clonagem profunda,
 * medição de tamanho, rótulo de caller e normalização de shape na hidratação.
 */

import type { PersistedRecord, PersistedValue } from './types';

/**
 * Clona um valor em profundidade preservando `Date` e `RegExp`.
 *
 * Lança `TypeError` em estruturas circulares (mesmo comportamento de
 * `JSON.stringify`), permitindo detectar payloads não serializáveis cedo.
 */
export function deepClone<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (seen.has(value as object)) {
    throw new TypeError('Converting circular structure to JSON');
  }

  if (value instanceof Date) return new Date(value.getTime()) as unknown as T;
  if (value instanceof RegExp) return new RegExp(value.source, value.flags) as unknown as T;

  if (Array.isArray(value)) {
    seen.add(value);
    const clonedArray = value.map((item) => deepClone(item, seen));
    seen.delete(value);
    return clonedArray as unknown as T;
  }

  seen.add(value as object);
  const source = value as PersistedRecord;
  const cloned: PersistedRecord = {};
  Object.keys(source).forEach((key) => {
    cloned[key] = deepClone(source[key], seen);
  });
  seen.delete(value as object);
  return cloned as unknown as T;
}

/** Mede o tamanho em bytes (UTF-8 quando possível) de uma string. */
export function getStringSizeInBytes(value: string): number {
  if (typeof value !== 'string') return 0;
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }
  return value.length;
}

/**
 * Best-effort: extrai a linha de stack do chamador externo, para anexar como
 * `caller` na telemetria. Retorna `fallback` quando indisponível.
 */
export function getCallerLabel(fallback = 'unknown'): string {
  const { stack } = new Error();
  if (!stack) return fallback;
  const callerLine = stack
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.includes('Error') && !line.includes('getCallerLabel') && !line.includes('usePersistedState'));
  return callerLine || fallback;
}

/**
 * Estado de fallback quando não há valor persistido (ou ele é incompatível).
 * Para objetos, marca `loaded: true`; arrays são devolvidos como clone.
 */
export function getFallbackState(initial: PersistedValue): PersistedValue {
  if (Array.isArray(initial)) return deepClone(initial);
  const cloned = deepClone(initial);
  (cloned as PersistedRecord).loaded = true;
  return cloned;
}

/**
 * Verifica se o dado persistido tem o mesmo "shape" do `initial`
 * (array com array, objeto com objeto). Evita aplicar dados corrompidos.
 */
export function isCompatibleStateShape(initial: PersistedValue, data: unknown): boolean {
  if (Array.isArray(initial)) {
    return Array.isArray(data);
  }
  return data !== null && typeof data === 'object' && !Array.isArray(data);
}

/**
 * Converte o valor cru lido do backend no estado hidratado entregue ao React.
 * Para objetos, adiciona `loaded: true` e preserva/define `lastUpdate`.
 */
export function toHydratedState(initial: PersistedValue, rawValue: unknown): PersistedValue {
  if (!isCompatibleStateShape(initial, rawValue)) {
    return getFallbackState(initial);
  }

  if (Array.isArray(rawValue)) {
    return deepClone(rawValue);
  }

  if (rawValue === null || rawValue === undefined) {
    return getFallbackState(initial);
  }

  const source = rawValue as PersistedRecord;
  const cloned = deepClone(source);
  cloned.loaded = true;
  cloned.lastUpdate = source.lastUpdate ?? new Date().toISOString();
  return cloned;
}

/** Clona o valor cru antes de guardá-lo no cache (evita aliasing). */
export function cloneRawValue<T>(rawValue: T): T {
  return deepClone(rawValue);
}
