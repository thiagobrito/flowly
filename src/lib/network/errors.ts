/* eslint-disable max-classes-per-file -- hierarquia de erros relacionados vive junta de propósito */

/**
 * Erros tipados da lib de network.
 *
 * Todos herdam de `NetworkError`, permitindo `catch (e) { if (e instanceof
 * NetworkError) ... }` e narrowing por subtipo.
 */

/** Erro base de qualquer falha de rede desta lib. */
export class NetworkError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'NetworkError';
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Resposta HTTP com status fora da faixa 2xx. */
export class HttpError<TBody = unknown> extends NetworkError {
  /** Código de status HTTP (ex.: 404, 500). */
  readonly status: number;

  /** Corpo da resposta de erro, já parseado quando possível. */
  readonly body: TBody;

  /** Headers da resposta de erro. */
  readonly headers: Record<string, string>;

  /** URL que originou o erro. */
  readonly url: string;

  constructor(params: { status: number; body: TBody; headers: Record<string, string>; url: string }) {
    super(`HTTP ${params.status} em ${params.url}`);
    this.name = 'HttpError';
    this.status = params.status;
    this.body = params.body;
    this.headers = params.headers;
    this.url = params.url;
  }
}

/** A requisição excedeu o tempo limite (`timeout`). */
export class TimeoutError extends NetworkError {
  /** Tempo limite que foi excedido, em ms. */
  readonly timeout: number;

  constructor(timeout: number, url: string) {
    super(`Requisição excedeu o timeout de ${timeout}ms em ${url}`);
    this.name = 'TimeoutError';
    this.timeout = timeout;
  }
}

/** Falha de conectividade (sem rede, DNS, CORS, etc.) — a requisição não completou. */
export class ConnectionError extends NetworkError {
  constructor(url: string, options?: { cause?: unknown }) {
    super(`Falha de conexão em ${url}`, options);
    this.name = 'ConnectionError';
  }
}

/** Type guard para `HttpError`. */
export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

/** Type guard para qualquer erro desta lib. */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}
