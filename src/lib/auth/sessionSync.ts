/**
 * Sincroniza a sessão persistida com o que o servidor devolveu.
 *
 * - 401 em rota protegida **com token já hidratado**: o JWT morreu; sem
 *   limpar a sessão o guard acha que ainda há login e a tela trava. 401 no
 *   boot (subscription/home antes do AsyncStorage) não pode apagar o token.
 * - Header `x-refreshed-token`: o servidor empurrou o `exp` do JWT; gravamos
 *   o valor novo para o próximo acesso não nascer já velho.
 *
 * O nome do header precisa coincidir com `REFRESHED_TOKEN_HEADER` no web.
 */

import { HttpError } from '@/lib/network';
import { getPersistedSnapshot, writePersistedSnapshot } from '@/lib/storage';

import type { Session } from './types';

export const SESSION_KEY = 'auth_session_v1';
export const EMPTY_SESSION: Session = { token: null, email: null, hasAccount: false };
export const REFRESHED_TOKEN_HEADER = 'x-refreshed-token';

export function isCredentialAuthUrl(url: string): boolean {
  return /\/auth\/(login|register)(\?|$)/.test(url);
}

export function shouldExpireSessionOnError(error: unknown): boolean {
  if (!(error instanceof HttpError) || error.status !== 401) return false;
  if (isCredentialAuthUrl(error.url)) return false;
  // Sem token hidratado, o 401 é "ainda não logou" — não "sessão morreu".
  // Gravar o vazio agora apagaria o JWT que ainda está no AsyncStorage.
  const session = getPersistedSnapshot(EMPTY_SESSION, SESSION_KEY);
  return Boolean(session.token);
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
