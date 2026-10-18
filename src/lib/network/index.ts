/**
 * # Network library
 *
 * Cliente HTTP genérico sobre `fetch` nativo. Centraliza **todas** as
 * requisições do app ao servidor: ponto único para `baseURL`, headers, timeout,
 * tratamento de erros e hooks (auth/logging futuros).
 *
 * Sem dependências novas — funciona em Expo / React Native.
 *
 * ## Uso rápido
 *
 * ```ts
 * import { api } from '@/lib/network';
 *
 * // GET tipado
 * const tasks = await api.get<Task[]>('/tasks');
 *
 * // POST com corpo JSON (serializado automaticamente)
 * const created = await api.post<Task>('/tasks', { name: 'Meditar' });
 *
 * // PUT / PATCH / DELETE
 * await api.put<Task>(`/tasks/${id}`, payload);
 * await api.patch<Task>(`/tasks/${id}`, { name: 'Novo nome' });
 * await api.delete(`/tasks/${id}`);
 * ```
 *
 * ## Query params, headers e timeout
 *
 * ```ts
 * await api.get<Task[]>('/tasks', {
 *   params: { area: 'health', done: false, tags: ['a', 'b'] }, // ?area=health&done=false&tags=a&tags=b
 *   headers: { 'X-Trace-Id': '123' },
 *   timeout: 5_000,
 * });
 * ```
 *
 * ## Tratamento de erros
 *
 * ```ts
 * import { api, HttpError, TimeoutError, isNetworkError } from '@/lib/network';
 *
 * try {
 *   await api.get('/tasks');
 * } catch (error) {
 *   if (error instanceof HttpError) {
 *     console.log(error.status, error.body); // resposta 4xx/5xx
 *   } else if (error instanceof TimeoutError) {
 *     console.log('demorou demais');
 *   } else if (isNetworkError(error)) {
 *     console.log('falha de conexão');
 *   }
 * }
 * ```
 *
 * ## Configuração da baseURL
 *
 * A instância default `api` lê `EXPO_PUBLIC_API_URL` do ambiente. Para
 * reconfigurar em runtime (ex.: trocar de ambiente):
 *
 * ```ts
 * import { configureApi } from '@/lib/network';
 *
 * configureApi({ baseURL: 'https://api.flowly.app', headers: { Authorization: 'Bearer ...' } });
 * ```
 *
 * ## Clientes adicionais
 *
 * Para falar com outra API, crie um client isolado:
 *
 * ```ts
 * import { createHttpClient } from '@/lib/network';
 *
 * const analytics = createHttpClient({ baseURL: 'https://metrics.exemplo.com' });
 * ```
 *
 * ## Autenticação
 *
 * O header `Authorization: Bearer <token>` é injetado automaticamente em todas
 * as requisições da instância `api`. Basta definir o token (ex.: após o login):
 *
 * ```ts
 * import { setAuthToken } from '@/lib/network';
 *
 * setAuthToken(token); // injeta em todas as próximas requisições
 * setAuthToken(null);  // remove o header (logout)
 * ```
 *
 * ## Exports principais
 *
 * - `api` — instância default compartilhada
 * - `setAuthToken` / `getAuthToken` — gerenciam o token de autenticação
 * - `setAuthTokenProvider` — resolve o token sob demanda a cada requisição
 * - `configureApi` — reconfigura a instância default
 * - `createHttpClient` — cria clients isolados
 * - Erros: `NetworkError`, `HttpError`, `TimeoutError`, `ConnectionError`, `isHttpError`, `isNetworkError`
 * - Tipos: `HttpClient`, `HttpClientConfig`, `RequestOptions`, `ApiResponse`, etc.
 */

import { createHttpClient } from './client';
import { resolveBaseURL } from './config';
import { HttpError } from './errors';
import type { HttpClient, HttpClientConfig } from './types';

/**
 * Token de autenticação compartilhado. É lido a cada requisição pelo hook
 * `onRequest` da instância default, então sempre reflete o valor mais recente
 * definido por `setAuthToken` (ex.: após login/logout).
 */
let authToken: string | null = null;

/**
 * Provedor opcional de token resolvido **sob demanda** (a cada requisição).
 *
 * Quando registrado, tem prioridade sobre o token estático definido por
 * `setAuthToken`. Isso desacopla a leitura do token da ordem dos `useEffect`
 * do React: o `onRequest` sempre lê o valor mais recente no momento do envio,
 * eliminando a corrida em que a requisição dispara antes do token ser injetado.
 */
let authTokenProvider: (() => string | null) | null = null;

/**
 * Define (ou limpa, com `null`) o token enviado no header `Authorization` de
 * todas as requisições da instância default `api`.
 */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/**
 * Registra (ou remove, com `null`) um provedor de token chamado a cada
 * requisição. Use-o para resolver o token a partir de uma fonte sempre
 * atualizada (ex.: snapshot síncrono da sessão persistida).
 */
export function setAuthTokenProvider(provider: (() => string | null) | null): void {
  authTokenProvider = provider;
}

/** Retorna o token de autenticação atual, ou `null` se não autenticado. */
export function getAuthToken(): string | null {
  return authTokenProvider?.() ?? authToken;
}

let onUnauthorized: ((error: HttpError) => void) | null = null;
let onRefreshedToken: ((token: string) => void) | null = null;

/**
 * Callbacks da sessão: 401 em rota protegida e JWT renovado no header
 * `x-refreshed-token`. A lib de auth registra os handlers; a de network não
 * conhece storage.
 */
export function setAuthSessionHandlers(handlers: { onUnauthorized?: ((error: HttpError) => void) | null; onRefreshedToken?: ((token: string) => void) | null }): void {
  if ('onUnauthorized' in handlers) onUnauthorized = handlers.onUnauthorized ?? null;
  if ('onRefreshedToken' in handlers) onRefreshedToken = handlers.onRefreshedToken ?? null;
}

let defaultConfig: HttpClientConfig = {
  baseURL: resolveBaseURL(),
  hooks: {
    onRequest: (request) => {
      const token = getAuthToken();
      if (token) {
        request.headers.Authorization = `Bearer ${token}`;
      } else {
        delete request.headers.Authorization;
      }
      return request;
    },
    onResponse: (response) => {
      const token = response.headers['x-refreshed-token'] ?? response.headers['X-Refreshed-Token'];
      if (token) onRefreshedToken?.(token);
    },
    onError: (error) => {
      if (error instanceof HttpError) onUnauthorized?.(error);
    },
  },
};
let instance: HttpClient = createHttpClient(defaultConfig);

/**
 * Reconfigura a instância default `api`. Faz merge superficial com a config
 * atual (e merge de `headers`). Útil para definir `baseURL`/auth no boot do app.
 */
export function configureApi(config: HttpClientConfig): HttpClient {
  defaultConfig = {
    ...defaultConfig,
    ...config,
    headers: { ...defaultConfig.headers, ...config.headers },
  };
  instance = createHttpClient(defaultConfig);
  return instance;
}

/**
 * Instância default do client HTTP. Use-a para todas as chamadas ao servidor.
 *
 * É um proxy que sempre delega para a configuração mais recente, então
 * referências obtidas antes de `configureApi()` continuam válidas.
 */
export const api: HttpClient = {
  request: (method, path, options) => instance.request(method, path, options),
  get: (path, options) => instance.get(path, options),
  post: (path, body, options) => instance.post(path, body, options),
  put: (path, body, options) => instance.put(path, body, options),
  patch: (path, body, options) => instance.patch(path, body, options),
  delete: (path, options) => instance.delete(path, options),
  get config() {
    return instance.config;
  },
};

export { createHttpClient } from './client';
export { buildUrl, DEFAULT_HEADERS, DEFAULT_TIMEOUT_MS, resolveBaseURL } from './config';
export { ConnectionError, HttpError, isHttpError, isNetworkError, NetworkError, TimeoutError } from './errors';
export type { ApiResponse, ClientHooks, Headers, HttpClient, HttpClientConfig, HttpMethod, ParseAs, PreparedRequest, QueryParams, QueryParamValue, RequestOptions } from './types';
