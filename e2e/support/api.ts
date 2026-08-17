/**
 * Interceptação da API consumida pelo app.
 *
 * O bundle de E2E é exportado com `EXPO_PUBLIC_API_URL=/api/v1`, então as
 * chamadas saem relativas à própria origem do bundle. Isso evita CORS e
 * preflight — o interceptador do Playwright responde antes de qualquer rede.
 *
 * Dois modos:
 * - **mock** (padrão): o backend falso em memória responde. Rápido, isolado por
 *   worker e capaz de simular falhas.
 * - **integração** (`E2E_API_URL`): a requisição é repassada ao backend real.
 *   O repasse é feito pelo processo do Playwright, não pelo browser, então
 *   continua sem CORS. É o modo que o `build.py` usa antes de publicar.
 */

import type { Page, Route } from '@playwright/test';

import { type FakeWorld, handle } from './backend';

export const API_PREFIX = '/api/v1';

/** Backend real quando definido; caso contrário, modo mock. */
export const INTEGRATION_API_URL = process.env.E2E_API_URL?.replace(/\/+$/, '') ?? null;
export const IS_INTEGRATION = INTEGRATION_API_URL !== null;

export type ApiCall = {
  method: string;
  path: string;
  query: string;
  status: number;
  /** `true` quando nenhum handler do backend falso conhecia o caminho. */
  unhandled: boolean;
};

export type ApiRecorder = {
  calls: ApiCall[];
  /** Caminhos chamados mais de uma vez — detector de loop de refetch. */
  duplicates(): { key: string; count: number }[];
  failed(allowlist?: RegExp[]): ApiCall[];
};

/**
 * Cria uma conta no backend real e devolve o token dela.
 *
 * O estado injetado no `localStorage` carrega um token de faz de conta, que a API
 * real recusa com 401. Em vez de semear o banco por fora, cada abertura registra
 * uma conta nova: o teste de integração passa a rodar sobre uma conta limpa, e o
 * cabeçalho `Authorization` é reescrito no repasse.
 */
async function registerRealAccount(): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@flowly.app`;
  const response = await fetch(`${INTEGRATION_API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'e2e-senha-forte-123', name: 'E2E' }),
  });

  if (!response.ok) throw new Error(`Não foi possível registrar a conta de integração: ${response.status}`);

  const body = (await response.json()) as { token?: string };
  if (!body.token) throw new Error('O registro não devolveu token.');
  return body.token;
}

function parseBody(route: Route): unknown {
  const raw = route.request().postData();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Liga a interceptação numa página e devolve o gravador das chamadas.
 *
 * `world` é mutável de propósito: o spec pode alterar o estado no meio do teste
 * (ex.: liberar premium) e a próxima requisição já vê a mudança.
 */
export async function installApi(page: Page, world: FakeWorld): Promise<ApiRecorder> {
  const calls: ApiCall[] = [];
  const token = IS_INTEGRATION ? await registerRealAccount() : null;

  // A varredura relança o app na mesma página; sem limpar, cada relançamento
  // deixaria um interceptador apontando para o mundo anterior.
  await page.unrouteAll({ behavior: 'ignoreErrors' });

  // Sentry está ativo no bundle (`app/_layout.tsx`). Sem o bloqueio, a suíte —
  // e principalmente a varredura, que provoca erros de propósito — publicaria
  // eventos no projeto de produção.
  await page.route(/sentry\.io|ingest\..*sentry/, (route) => route.abort());

  await page.route(`**${API_PREFIX}/**`, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.slice(url.pathname.indexOf(API_PREFIX) + API_PREFIX.length) || '/';
    const method = route.request().method();

    if (IS_INTEGRATION) {
      // Bufferiza o corpo antes do fulfill: passar `{ response }` direto falha com
      // "Fetch response has been disposed" quando a página navega/recarrega no
      // meio do repasse (o teste de integração faz `reload` após concluir).
      try {
        const response = await route.fetch({
          url: `${INTEGRATION_API_URL}${path}${url.search}`,
          headers: { ...route.request().headers(), authorization: `Bearer ${token}` },
        });
        const status = response.status();
        const headers = response.headers();
        const body = await response.body();
        calls.push({ method, path, query: url.search, status, unhandled: false });
        await route.fulfill({ status, headers, body });
      } catch {
        // Request abortado pela navegação — não há o que cumprir.
        try {
          await route.abort();
        } catch {
          // Já encerrado.
        }
      }
      return;
    }

    const result = handle(world, method, path, url.searchParams, parseBody(route));
    const status = result?.status ?? 404;
    calls.push({ method, path, query: url.search, status, unhandled: result === null });

    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(result?.body ?? { error: `Sem fixture para ${method} ${path}` }),
    });
  });

  return {
    calls,
    duplicates() {
      const counts = new Map<string, number>();
      for (const call of calls) {
        // Só GET: POST repetido pode ser legítimo (telemetria em lote).
        if (call.method !== 'GET') continue;
        const key = `${call.method} ${call.path}${call.query}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return [...counts.entries()].filter(([, count]) => count > 1).map(([key, count]) => ({ key, count }));
    },
    failed(allowlist = []) {
      return calls.filter((call) => call.status >= 400 && !allowlist.some((pattern) => pattern.test(call.path)));
    },
  };
}

/**
 * Endpoints que o app chama e o backend não implementa.
 *
 * Ambos degradam em silêncio por design (`catch` explícito no chamador), então
 * são 404 esperados: viram teste de degradação graciosa em vez de falha.
 */
export const KNOWN_MISSING_ENDPOINTS = [/^\/onboarding$/, /^\/ai\/parse-task-field$/];
