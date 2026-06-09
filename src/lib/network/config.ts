/**
 * Defaults e helpers de configuração da lib de network.
 */

import type { Headers, QueryParams } from './types';

/** Timeout padrão de uma requisição (ms). */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** Headers aplicados por padrão em todas as requisições. */
export const DEFAULT_HEADERS: Headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

/**
 * Resolve a `baseURL` padrão a partir do ambiente.
 *
 * Lê `EXPO_PUBLIC_API_URL` (variáveis com prefixo `EXPO_PUBLIC_` são embutidas
 * no bundle pelo Expo). Retorna string vazia se não definida — nesse caso,
 * paths absolutos (`https://...`) ainda funcionam.
 */
export function resolveBaseURL(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  return typeof fromEnv === 'string' ? fromEnv.trim().replace(/\/+$/, '') : '';
}

/** Serializa um valor de query param em uma ou mais entradas `key=value`. */
function appendParam(search: URLSearchParams, key: string, value: QueryParams[string]): void {
  if (value === null || value === undefined) return;

  if (Array.isArray(value)) {
    value.forEach((item) => search.append(key, String(item)));
    return;
  }

  search.append(key, String(value));
}

/**
 * Monta a URL final combinando `baseURL`, `path` e `params`.
 *
 * - `path` absoluto (`http://`/`https://`) ignora a `baseURL`.
 * - Faz join seguro de barras entre `baseURL` e `path`.
 * - Adiciona a query string a partir de `params` (ignorando `null`/`undefined`).
 */
export function buildUrl(baseURL: string, path: string, params?: QueryParams): string {
  const isAbsolute = /^https?:\/\//i.test(path);
  let url: string;

  if (isAbsolute || !baseURL) {
    url = path;
  } else {
    const base = baseURL.replace(/\/+$/, '');
    const suffix = path.replace(/^\/+/, '');
    url = `${base}/${suffix}`;
  }

  if (!params) return url;

  const search = new URLSearchParams();
  Object.keys(params).forEach((key) => appendParam(search, key, params[key]));
  const query = search.toString();
  if (!query) return url;

  return url.includes('?') ? `${url}&${query}` : `${url}?${query}`;
}
