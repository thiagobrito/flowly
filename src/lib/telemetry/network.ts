/**
 * Telemetria das falhas de rede.
 *
 * Aproveita o hook `onError` do client HTTP para transformar os erros já
 * tipados da lib de network em eventos agregáveis por rota. O path é
 * normalizado (sem ids nem query) para que o painel some ocorrências da mesma
 * rota em vez de espalhá-las.
 */

import { api, configureApi, HttpError, NetworkError, resolveBaseURL } from '@/lib/network';

import { track } from './track';

let installed = false;

/** Remove baseURL, query e identificadores para agrupar por rota. */
export function normalizePath(url: string): string {
  const withoutQuery = url.split('?')[0] ?? url;
  const base = resolveBaseURL();
  const path = base && withoutQuery.startsWith(base) ? withoutQuery.slice(base.length) : withoutQuery;

  const normalized = path
    .replace(/\/[0-9a-f]{24}(?=\/|$)/gi, '/:id')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .replace(/\/\d{4}-\d{2}-\d{2}(?=\/|$)/g, '/:date');

  return normalized || '/';
}

function reportNetworkError(error: unknown): void {
  if (!(error instanceof NetworkError)) return;

  const url = 'url' in error && typeof (error as { url?: unknown }).url === 'string' ? (error as { url: string }).url : '';
  const path = normalizePath(url);

  // A própria rota de telemetria não gera telemetria — evita laço em queda.
  if (path.startsWith('/events')) return;

  track('api_request_failed', {
    path,
    status: error instanceof HttpError ? error.status : 0,
    kind: error.name,
  });
}

/**
 * Encadeia o repasse de erros ao hook já configurado (a injeção do token vive
 * em `onRequest` e precisa continuar valendo). Idempotente.
 */
export function installNetworkTelemetry(): void {
  if (installed) return;
  installed = true;

  const current = api.config.hooks;

  configureApi({
    hooks: {
      ...current,
      onError: async (error) => {
        await current?.onError?.(error);
        reportNetworkError(error);
      },
    },
  });
}
