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
 * URL de produção da API. Mesmo valor usado pela automação de build iOS
 * (`build/config.py` → `PRODUCTION_API_URL`); mantenha os dois em sincronia.
 */
export const PRODUCTION_API_URL = 'https://flowly-web-coral.vercel.app/api/v1';

/** `true` quando a URL aponta para um ambiente local de desenvolvimento. */
function isLocalUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)([:/]|$)/i.test(url);
}

/**
 * Resolve a `baseURL` padrão a partir do ambiente.
 *
 * Lê `EXPO_PUBLIC_API_URL` (variáveis com prefixo `EXPO_PUBLIC_` são embutidas
 * no bundle pelo Expo). Em builds de release, uma URL ausente ou apontando para
 * localhost (o valor de dev do `.env`) cai na URL de produção — garante que
 * builds Android/EAS, que não passam pela override do `build.py`, nunca
 * embarquem o localhost.
 */
export function resolveBaseURL(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const url = typeof fromEnv === 'string' ? fromEnv.trim().replace(/\/+$/, '') : '';

  if (!__DEV__ && (!url || isLocalUrl(url))) return PRODUCTION_API_URL;
  return url;
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
