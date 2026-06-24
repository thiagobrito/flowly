/**
 * # Auth library
 *
 * Camada fina de autenticação sobre as libs de `network` e `storage`. Persiste
 * a sessão (token + e-mail) com `usePersistedState` e injeta o header
 * `Authorization` na instância default da `api` via `configureApi`.
 *
 * ## Uso
 *
 * ```tsx
 * import { useSession } from '@/lib/auth';
 *
 * const { isHydrated, isAuthenticated, pending, signIn, signUp, signOut } = useSession();
 *
 * const res = await signIn({ email, password });
 * if (!res.ok) Alert.alert('Erro', res.error);
 * ```
 *
 * - `isHydrated` — `false` até a leitura do storage terminar (evita flicker no guard).
 * - `isAuthenticated` — há token válido em sessão.
 * - `pending` — uma chamada de login/cadastro está em andamento.
 */

import { useCallback, useEffect, useState } from 'react';

import { api, HttpError, isNetworkError, setAuthToken, setAuthTokenProvider } from '@/lib/network';
import { getPersistedSnapshot, usePersistedState } from '@/lib/storage';
import { loginUser, logoutUser } from '@/lib/subscription';

import type { AuthResponse, AuthResult, Credentials, Session } from './types';

const SESSION_KEY = 'auth_session_v1';
const EMPTY_SESSION: Session = { token: null, email: null };

/**
 * Resolve o token sob demanda a partir do snapshot síncrono da sessão
 * persistida. Registrado no boot do módulo para que toda requisição leia o
 * token mais recente, sem depender da ordem de execução dos `useEffect`.
 */
setAuthTokenProvider(() => getPersistedSnapshot(EMPTY_SESSION, SESSION_KEY).token ?? null);

/** Liga/desliga o header `Authorization` na instância default da `api`. */
function applyAuthHeader(token: string | null): void {
  setAuthToken(token);
}

/** Traduz erros da lib de network em mensagens amigáveis em pt-BR. */
function toFriendlyMessage(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 401 || error.status === 400) return 'E-mail ou senha inválidos.';
    if (error.status === 409) return 'Este e-mail já está cadastrado.';
    const body = error.body as { message?: string } | null;
    return body?.message ?? `Não foi possível concluir (erro ${error.status}).`;
  }
  if (isNetworkError(error)) return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
  return 'Algo deu errado. Tente novamente.';
}

/**
 * Hook de sessão. Várias telas podem usá-lo simultaneamente — o estado é
 * compartilhado pela chave de storage, então login/logout refletem em todas.
 */
export function useSession() {
  const [session, setSession] = usePersistedState<Session>(EMPTY_SESSION, SESSION_KEY);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (session.loaded) applyAuthHeader(session.token ?? null);
  }, [session.loaded, session.token]);

  const authenticate = useCallback(
    async (path: string, credentials: Credentials): Promise<AuthResult> => {
      setPending(true);
      try {
        const data = await api.post<AuthResponse>(path, credentials);
        applyAuthHeader(data.token);
        const email = data.user?.email ?? credentials.email;
        setSession({ token: data.token, email });
        // Vincula as compras ao usuário no RevenueCat (não bloqueia o login).
        loginUser(email).catch(() => undefined);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: toFriendlyMessage(error) };
      } finally {
        setPending(false);
      }
    },
    [setSession],
  );

  const signIn = useCallback((credentials: Credentials) => authenticate('/auth/login', credentials), [authenticate]);

  const signUp = useCallback((credentials: Credentials) => authenticate('/auth/register', credentials), [authenticate]);

  const signOut = useCallback(() => {
    applyAuthHeader(null);
    logoutUser().catch(() => undefined);
    setSession({ ...EMPTY_SESSION });
  }, [setSession]);

  return {
    session,
    isHydrated: Boolean(session.loaded),
    isAuthenticated: Boolean(session.token),
    pending,
    signIn,
    signUp,
    signOut,
  };
}

export type { AuthResponse, AuthResult, Credentials, Session } from './types';
