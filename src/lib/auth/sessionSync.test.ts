import { HttpError } from '@/lib/network';

import { EMPTY_SESSION, expireStoredSession, persistRefreshedToken, persistSession, refreshedTokenFromHeaders, SESSION_KEY, shouldExpireSessionOnError } from './sessionSync';

jest.mock('@/lib/storage', () => {
  const memory = new Map<string, unknown>();
  return {
    getPersistedSnapshot: (_initial: unknown, key: string) => memory.get(key) ?? { token: null, email: null, hasAccount: false, loaded: true },
    writePersistedSnapshot: (key: string, value: unknown) => {
      memory.set(key, value);
    },
    memoryStore: memory,
  };
});

const storage = jest.requireMock('@/lib/storage') as { memoryStore: Map<string, unknown> };

describe('sessionSync', () => {
  beforeEach(() => {
    storage.memoryStore.clear();
  });

  function unauthorized(url: string, body: Record<string, unknown>, sentAuthorization = true) {
    return new HttpError({ status: 401, body, headers: {}, url, sentAuthorization });
  }

  it('token expirado ou inválido encerra a sessão; login e 500 não', () => {
    persistSession({ ...EMPTY_SESSION, token: 'jwt', email: 'a@b.c', hasAccount: true });

    expect(shouldExpireSessionOnError(unauthorized('https://flowly.app/api/v1/subscription', { error: 'Unauthorized', code: 'token_expired' }))).toBe(true);
    expect(shouldExpireSessionOnError(unauthorized('https://flowly.app/api/v1/home', { error: 'Unauthorized', code: 'token_invalid' }))).toBe(true);
    expect(shouldExpireSessionOnError(unauthorized('https://flowly.app/api/v1/home', {}))).toBe(true);
    expect(shouldExpireSessionOnError(unauthorized('https://flowly.app/api/v1/auth/login', { error: 'Unauthorized', code: 'token_expired' }))).toBe(false);
    expect(shouldExpireSessionOnError(new HttpError({ status: 500, body: {}, headers: {}, url: 'https://flowly.app/api/v1/home' }))).toBe(false);
  });

  it('header ausente não desloga, mesmo com o token já hidratado', () => {
    persistSession({ ...EMPTY_SESSION, token: 'jwt', email: 'a@b.c', hasAccount: true });

    expect(shouldExpireSessionOnError(unauthorized('https://flowly.app/api/v1/subscription', { error: 'Unauthorized', code: 'missing_authorization' }))).toBe(false);
    expect(shouldExpireSessionOnError(unauthorized('https://flowly.app/api/v1/subscription', { error: 'Unauthorized' }, false))).toBe(false);
    expect(shouldExpireSessionOnError(unauthorized('https://flowly.app/api/v1/home', { error: 'Unauthorized', code: 'token_expired' }, false))).toBe(false);
    expect(shouldExpireSessionOnError(new HttpError({ status: 403, body: { code: 'missing_authorization' }, headers: {}, url: 'https://flowly.app/api/v1/subscription' }))).toBe(false);
  });

  it('401 sem token hidratado não apaga a sessão que ainda está no disco', () => {
    expect(shouldExpireSessionOnError(unauthorized('https://flowly.app/api/v1/home', { code: 'token_expired' }))).toBe(false);
    expect(shouldExpireSessionOnError(unauthorized('https://flowly.app/api/v1/subscription', { code: 'token_expired' }))).toBe(false);
  });

  it('lê o JWT renovado mesmo com o header em outra caixa', () => {
    expect(refreshedTokenFromHeaders({ 'x-refreshed-token': 'abc' })).toBe('abc');
    expect(refreshedTokenFromHeaders({ 'X-Refreshed-Token': 'abc' })).toBe('abc');
    expect(refreshedTokenFromHeaders({})).toBeNull();
  });

  it('expireStoredSession apaga o token e preserva hasAccount', () => {
    persistSession({ ...EMPTY_SESSION, token: 'velho', email: 'a@b.c', hasAccount: true });

    expect(expireStoredSession()).toMatchObject({ token: null, email: null, hasAccount: true });
    expect(storage.memoryStore.get(SESSION_KEY)).toMatchObject({ token: null, hasAccount: true });
  });

  it('persistRefreshedToken só grava quando já havia sessão e o valor mudou', () => {
    expect(persistRefreshedToken('novo')).toBeNull();

    persistSession({ ...EMPTY_SESSION, token: 'velho', email: 'a@b.c', hasAccount: true });
    expect(persistRefreshedToken('velho')).toBeNull();
    expect(persistRefreshedToken('novo')).toMatchObject({ token: 'novo', email: 'a@b.c' });
  });
});
