/**
 * Tipos públicos da lib de network.
 *
 * Mantidos isolados do `client.ts` para que callers possam importar apenas
 * os contratos (ex.: em assinaturas de funções) sem puxar a implementação.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Como o corpo da resposta deve ser interpretado.
 * - `json` (padrão): `JSON.parse` do corpo
 * - `text`: retorna a string crua
 * - `blob`: retorna um `Blob` (downloads/binários)
 * - `none`: ignora o corpo e retorna `null` (ex.: `204 No Content`)
 */
export type ParseAs = 'json' | 'text' | 'blob' | 'none';

/** Valor aceito como query param. Arrays viram múltiplas entradas (`?id=1&id=2`). */
export type QueryParamValue = string | number | boolean | null | undefined | Array<string | number | boolean>;

/** Mapa de query params. Chaves com valor `null`/`undefined` são ignoradas. */
export type QueryParams = Record<string, QueryParamValue>;

/** Cabeçalhos HTTP. Valores `undefined` removem o header (útil para sobrescrever defaults). */
export type Headers = Record<string, string | undefined>;

/** Opções aceitas por uma requisição individual. */
export type RequestOptions = {
  /** Headers específicos desta requisição (mesclados sobre os defaults do client). */
  headers?: Headers;
  /** Query params adicionados à URL. */
  params?: QueryParams;
  /**
   * Corpo da requisição. Objetos comuns são serializados como JSON.
   * `string`, `FormData`, `Blob` e `ArrayBuffer` são enviados como estão.
   */
  body?: unknown;
  /** `AbortSignal` para cancelamento externo (combinado com o timeout interno). */
  signal?: AbortSignal;
  /** Timeout em milissegundos. Sobrescreve o timeout do client. Use `0` para desabilitar. */
  timeout?: number;
  /** Como interpretar a resposta. Padrão: `json`. */
  parseAs?: ParseAs;
};

/** Hooks de ciclo de vida — ponto de extensão para auth, logging, métricas etc. */
export type ClientHooks = {
  /** Executado antes do envio. Pode retornar um request modificado (ex.: injetar token). */
  onRequest?: (request: PreparedRequest) => PreparedRequest | Promise<PreparedRequest>;
  /** Executado após uma resposta bem-sucedida (status 2xx). */
  onResponse?: (response: ApiResponse<unknown>) => void | Promise<void>;
  /** Executado quando a requisição falha (qualquer `NetworkError`). */
  onError?: (error: unknown) => void | Promise<void>;
};

/** Configuração de um `HttpClient`. */
export type HttpClientConfig = {
  /** URL base prefixada em todos os paths relativos. Ex.: `https://api.exemplo.com`. */
  baseURL?: string;
  /** Headers padrão aplicados a todas as requisições. */
  headers?: Headers;
  /** Timeout padrão em ms. Padrão: `DEFAULT_TIMEOUT_MS`. */
  timeout?: number;
  /** Hooks de ciclo de vida. */
  hooks?: ClientHooks;
};

/** Snapshot imutável de uma requisição já preparada (passado para `onRequest`). */
export type PreparedRequest = {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body: BodyInit | null;
};

/** Resposta normalizada retornada pelos métodos do client. */
export type ApiResponse<T> = {
  /** Corpo já parseado conforme `parseAs`. */
  data: T;
  /** Código de status HTTP. */
  status: number;
  /** Headers da resposta. */
  headers: Record<string, string>;
};

/** Assinatura de um client HTTP. */
export type HttpClient = {
  request: <T = unknown>(method: HttpMethod, path: string, options?: RequestOptions) => Promise<ApiResponse<T>>;
  get: <T = unknown>(path: string, options?: Omit<RequestOptions, 'body'>) => Promise<T>;
  post: <T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) => Promise<T>;
  put: <T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) => Promise<T>;
  patch: <T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) => Promise<T>;
  delete: <T = unknown>(path: string, options?: Omit<RequestOptions, 'body'>) => Promise<T>;
  /** Config efetiva do client (somente leitura). */
  readonly config: Readonly<HttpClientConfig>;
};
