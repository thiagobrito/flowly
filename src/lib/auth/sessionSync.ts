/**
 * Sincroniza a sessão persistida com o que o servidor devolveu.
 *
 * - 401 com `code: missing_authorization`, ou pedido que saiu sem header:
 *   o JWT no aparelho pode continuar válido. Não desloga.
 * - 401 com `code: token_expired` ou `token_invalid`: o token enviado morreu.
 *   Sem limpar a sessão o guard acha que ainda há login e a tela trava.
 * - Header `x-refreshed-token`: o servidor empurrou o `exp` do JWT; gravamos
 *   o valor novo para o próximo acesso não nascer já velho.
 *
 * Os `code` precisam coincidir com `AUTH_FAILURE_CODE` em `web/src/lib/auth/token.js`.
 * O nome do header precisa coincidir com `REFRESHED_TOKEN_HEADER` no web.
 */

import { HttpError } from '@/lib/network';
import { getPersistedSnapshot, writePersistedSnapshot } from '@/lib/storage';

import type { Session } from './types';

const MISSING_AUTHORIZATION = 'missing_authorization';
const TOKEN_EXPIRED = 'token_expired';
const TOKEN_INVALID = 'token_invalid';

export const SESSION_KEY = 'auth_session_v1';
export const EMPTY_SESSION: Session = { token: null, email: null, hasAccount: false };
export const REFRESHED_TOKEN_HEADER = 'x-refreshed-token';

export function isCredentialAuthUrl(url: string): boolean {
  return /\/auth\/(login|register)(\?|$)/.test(url);
}

function failureCode(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const { code } = body as { code?: unknown };
  return typeof code === 'string' ? code : null;
}

export function shouldExpireSessionOnError(error: unknown): boolean {
  if (!(error instanceof HttpError) || error.status !== 401) return false;
  if (isCredentialAuthUrl(error.url)) return false;

  const code = failureCode(error.body);
  // Pedido sem header (corrida no boot, chamada antes do AsyncStorage) ou o
  // servidor confirmando que o header não chegou. O JWT guardado segue válido.
  if (error.sentAuthorization === false || code === MISSING_AUTHORIZATION) return false;

  // Sem token hidratado, o 401 é "ainda não logou" — não "sessão morreu".
  // Gravar o vazio agora apagaria o JWT que ainda está no AsyncStorage.
  const session = getPersistedSnapshot(EMPTY_SESSION, SESSION_KEY);
  if (!session.token) return false;

  if (code === TOKEN_EXPIRED || code === TOKEN_INVALID) return true;
  // Servidor antigo não manda `code`. O header foi enviado e a rota recusou.
  return code === null;
}

export function refreshedTokenFromHeaders(headers: Record<string, string>): string | null {
  const value = headers[REFRESHED_TOKEN_HEADER] ?? headers['X-Refreshed-Token'];
  return value || null;
}

export function persistSession(next: Session): void {
  writePersistedSnapshot(SESSION_KEY, next);
}

export function expireStoredSession(): Session {
  const next: Session = { ...EMPTY_SESSION, hasAccount: true };
  persistSession(next);
  return next;
}

export function persistRefreshedToken(token: string): Session | null {
  const current = getPersistedSnapshot(EMPTY_SESSION, SESSION_KEY);
  if (!current.token || current.token === token) return null;
  const next: Session = { ...current, token };
  persistSession(next);
  return next;
}
