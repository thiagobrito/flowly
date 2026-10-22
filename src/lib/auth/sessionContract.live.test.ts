/**
 * Regra de logout do app contra respostas de um servidor de verdade.
 *
 * Só roda com `FLOWLY_API_URL` (ex.: http://127.0.0.1:3100/api/v1). Com
 * `FLOWLY_JWT_SECRET` do mesmo servidor entram também token expirado e válido.
 * O pedido sai pelo `createHttpClient` do app e o erro passa pela mesma
 * `shouldExpireSessionOnError` que o handler de 401 usa em produção.
 */

import { createHmac } from 'node:crypto';

import { createHttpClient, HttpError } from '@/lib/network';

import { EMPTY_SESSION, persistSession, shouldExpireSessionOnError } from './sessionSync';

jest.mock('@/lib/storage', () => {
  const memory = new Map<string, unknown>();
  return {
    getPersistedSnapshot: (_initial: unknown, key: string) => memory.get(key) ?? { token: null, email: null, hasAccount: false, loaded: true },
    writePersistedSnapshot: (key: string, value: unknown) => {
      memory.set(key, value);
    },
  };
});

const BASE = process.env.FLOWLY_API_URL?.replace(/\/+$/, '') ?? null;
const SECRET = process.env.FLOWLY_JWT_SECRET ?? null;
const ORPHAN_USER = '64b7f9c2e4b0a1c2d3e4f5a6';

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signHs256(payload: Record<string, unknown>, secret: string): string {
  const unsigned = `${base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64Url(JSON.stringify(payload))}`;
  return `${unsigned}.${base64Url(createHmac('sha256', secret).update(unsigned).digest())}`;
}

type Outcome = { status: number; code: string | null; logout: boolean };

async function outcome(method: 'GET' | 'POST', path: string, token: string | null, body?: unknown): Promise<Outcome> {
  const client = createHttpClient({ baseURL: BASE ?? '', headers: token ? { Authorization: `Bearer ${token}` } : {} });
  try {
    const response = await client.request(method, path, { body });
    return { status: response.status, code: null, logout: false };
  } catch (error) {
    if (!(error instanceof HttpError)) throw error;
    const code = (error.body as { code?: string } | null)?.code ?? null;
    return { status: error.status, code, logout: shouldExpireSessionOnError(error) };
  }
}

const EVENTS_BODY = {
  device_id: 'session-contract-live',
  platform: 'ios',
  app_version: 'verify',
  events: [{ name: 'verify_session_status_nao_existe', ts: new Date().toISOString(), session_id: 'verify' }],
};

const describeLive = BASE ? describe : describe.skip;
const describeSigned = BASE && SECRET ? describe : describe.skip;

describeLive('contrato de sessão contra o servidor real', () => {
  beforeEach(() => {
    persistSession({ ...EMPTY_SESSION, token: 'jwt-guardado-no-aparelho', email: 'a@b.c', hasAccount: true });
  });

  it('pedido sem Authorization não desloga em nenhuma rota do boot', async () => {
    expect(await outcome('GET', '/subscription', null)).toEqual({ status: 403, code: 'missing_authorization', logout: false });
    expect(await outcome('GET', '/home', null)).toEqual({ status: 403, code: 'missing_authorization', logout: false });
    expect(await outcome('POST', '/events', null, EVENTS_BODY)).toEqual({ status: 400, code: null, logout: false });
  });

  it('token rejeitado pelo servidor desloga', async () => {
    const forged = signHs256({ userId: ORPHAN_USER, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 600 }, 'segredo-de-atacante');
    expect(await outcome('GET', '/subscription', forged)).toEqual({ status: 401, code: 'token_invalid', logout: true });
  });
});

describeSigned('contrato de sessão com tokens assinados pelo servidor', () => {
  beforeEach(() => {
    persistSession({ ...EMPTY_SESSION, token: 'jwt-guardado-no-aparelho', email: 'a@b.c', hasAccount: true });
  });

  it('token expirado desloga; token válido não', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = signHs256({ userId: ORPHAN_USER, iat: now - 120, exp: now - 60 }, SECRET as string);
    const valid = signHs256({ userId: ORPHAN_USER, iat: now, exp: now + 600 }, SECRET as string);

    expect(await outcome('GET', '/subscription', expired)).toEqual({ status: 401, code: 'token_expired', logout: true });
    expect(await outcome('POST', '/events', expired, EVENTS_BODY)).toEqual({ status: 401, code: 'token_expired', logout: true });
    expect(await outcome('GET', '/subscription', valid)).toEqual({ status: 200, code: null, logout: false });
  });
});
