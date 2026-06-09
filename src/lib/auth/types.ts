/**
 * Tipos públicos da lib de auth.
 */

import type { PersistedRecord } from '@/lib/storage';

/** Sessão persistida do usuário. `token` nulo significa deslogado. */
export type Session = PersistedRecord & {
  token: string | null;
  email: string | null;
  /** Marcado como `true` pela lib de storage após a hidratação. */
  loaded?: boolean;
  lastUpdate?: string;
};

/** Credenciais informadas pelo usuário no login/cadastro. */
export type Credentials = {
  email: string;
  password: string;
};

/** Resposta esperada dos endpoints de autenticação. */
export type AuthResponse = {
  token: string;
  user?: { email?: string };
};

/** Resultado de uma operação de auth (login/cadastro). */
export type AuthResult = { ok: true } | { ok: false; error: string };
