/**
 * Implementação do cliente HTTP genérico sobre `fetch` nativo.
 */

import { buildUrl, DEFAULT_HEADERS, DEFAULT_TIMEOUT_MS } from './config';
import { ConnectionError, HttpError, NetworkError, TimeoutError } from './errors';
import type { ApiResponse, Headers, HttpClient, HttpClientConfig, HttpMethod, ParseAs, PreparedRequest, RequestOptions } from './types';

/** Mescla mapas de headers, removendo chaves cujo valor é `undefined`. */
function mergeHeaders(...sources: Array<Headers | undefined>): Record<string, string> {
  const result: Record<string, string> = {};

  for (const source of sources) {
    if (source) {
      for (const key of Object.keys(source)) {
        const value = source[key];
        if (value === undefined) {
          delete result[key];
        } else {
          result[key] = value;
        }
      }
    }
  }

  return result;
}

/** Valores que devem ser enviados como estão, sem serialização JSON. */
function isRawBody(body: unknown): body is BodyInit {
  return typeof body === 'string' || body instanceof FormData || body instanceof URLSearchParams || body instanceof Blob || body instanceof ArrayBuffer;
}

/**
 * Prepara o corpo da requisição.
 * Retorna o `BodyInit` e se o `Content-Type: application/json` deve ser removido
 * (quando o corpo não é JSON, deixamos o runtime definir o header correto).
 */
function prepareBody(body: unknown): { body: BodyInit | null; isJson: boolean } {
  if (body === undefined || body === null) return { body: null, isJson: false };
  if (isRawBody(body)) return { body, isJson: false };
  return { body: JSON.stringify(body), isJson: true };
}

function collectHeaders(headers: Response['headers']): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value: string, key: string) => {
    result[key] = value;
  });
  return result;
}

async function parseResponseBody(response: Response, parseAs: ParseAs): Promise<unknown> {
  if (parseAs === 'none' || response.status === 204) return null;
  if (parseAs === 'text') return response.text();
  if (parseAs === 'blob') return response.blob();

  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // Resposta marcada como JSON mas com corpo inválido: devolve o texto cru.
    return text;
  }
}

/** Converte erros crus do `fetch`/abort em erros tipados desta lib. */
function normalizeError(error: unknown, controller: AbortController, url: string, timeout: number): unknown {
  if (error instanceof NetworkError) return error;

  // Abort: pode ter sido o timeout (reason é um TimeoutError) ou cancelamento externo.
  const isAbort = error instanceof Error && error.name === 'AbortError';
  if (isAbort) {
    const { reason } = controller.signal;
    if (reason instanceof TimeoutError) return reason;
    if (reason instanceof NetworkError) return reason;
    return new TimeoutError(timeout, url);
  }

  // `fetch` lança TypeError em falhas de conectividade/DNS/CORS.
  if (error instanceof TypeError) {
    return new ConnectionError(url, { cause: error });
  }

  return new NetworkError(error instanceof Error ? error.message : 'Erro de rede desconhecido', { cause: error });
}

/**
 * Cria um cliente HTTP isolado com sua própria `baseURL`, headers e hooks.
 * Use-o para falar com APIs distintas ou para configurações específicas.
 */
export function createHttpClient(config: HttpClientConfig = {}): HttpClient {
  const baseConfig: Required<Omit<HttpClientConfig, 'hooks'>> & Pick<HttpClientConfig, 'hooks'> = {
    baseURL: config.baseURL ?? '',
    headers: config.headers ?? {},
    timeout: config.timeout ?? DEFAULT_TIMEOUT_MS,
    hooks: config.hooks,
  };

  async function request<T = unknown>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = buildUrl(baseConfig.baseURL, path, options.params);
    const timeout = options.timeout ?? baseConfig.timeout;
    const parseAs = options.parseAs ?? 'json';

    const { body, isJson } = prepareBody(options.body);
    const headers = mergeHeaders(DEFAULT_HEADERS, baseConfig.headers, options.headers);
    if (!isJson && body !== null) {
      // Deixa o runtime definir o Content-Type para FormData/Blob/etc.
      delete headers['Content-Type'];
    }

    let prepared: PreparedRequest = { method, url, headers, body };
    if (baseConfig.hooks?.onRequest) {
      prepared = await baseConfig.hooks.onRequest(prepared);
    }

    const controller = new AbortController();
    const timeoutId = timeout > 0 ? setTimeout(() => controller.abort(new TimeoutError(timeout, prepared.url)), timeout) : undefined;

    if (options.signal) {
      if (options.signal.aborted) controller.abort(options.signal.reason);
      else options.signal.addEventListener('abort', () => controller.abort(options.signal?.reason), { once: true });
    }

    try {
      const response = await fetch(prepared.url, {
        method: prepared.method,
        headers: prepared.headers,
        body: prepared.body,
        signal: controller.signal,
      });

      const data = await parseResponseBody(response, parseAs);
      const responseHeaders = collectHeaders(response.headers);

      if (!response.ok) {
        throw new HttpError({
          status: response.status,
          body: data,
          headers: responseHeaders,
          url: prepared.url,
        });
      }

      const result: ApiResponse<T> = {
        data: data as T,
        status: response.status,
        headers: responseHeaders,
      };

      if (baseConfig.hooks?.onResponse) await baseConfig.hooks.onResponse(result);
      return result;
    } catch (error) {
      const normalized = normalizeError(error, controller, prepared.url, timeout);
      if (baseConfig.hooks?.onError) await baseConfig.hooks.onError(normalized);
      throw normalized;
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }

  const client: HttpClient = {
    request,
    get: <T = unknown>(path: string, options?: Omit<RequestOptions, 'body'>) => request<T>('GET', path, options).then((r) => r.data),
    post: <T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) => request<T>('POST', path, { ...options, body }).then((r) => r.data),
    put: <T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) => request<T>('PUT', path, { ...options, body }).then((r) => r.data),
    patch: <T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) => request<T>('PATCH', path, { ...options, body }).then((r) => r.data),
    delete: <T = unknown>(path: string, options?: Omit<RequestOptions, 'body'>) => request<T>('DELETE', path, options).then((r) => r.data),
    config: baseConfig,
  };

  return client;
}
