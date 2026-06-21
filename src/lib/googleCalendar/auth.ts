/**
 * Autenticação OAuth com o Google via `expo-auth-session`.
 *
 * Fluxo client-side (PKCE) que devolve um `accessToken` com escopo de leitura
 * da Calendar API. Os tokens são persistidos com a lib de `storage`, então a
 * conexão sobrevive a reinícios do app.
 *
 * > Requer dev/standalone build (o redirect nativo não funciona no Expo Go).
 */

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect } from 'react';

import { getPersistedSnapshot, usePersistedState } from '@/lib/storage';

import { getGoogleClientIds, GOOGLE_CALENDAR_SCOPES, GOOGLE_TOKENS_KEY } from './config';
import type { GoogleTokens } from './types';

// Finaliza a sessão de auth quando o app volta do navegador.
WebBrowser.maybeCompleteAuthSession();

const EMPTY_TOKENS: GoogleTokens = { accessToken: null, expiresAt: null, account: null };

/** Margem (ms) para considerar o token expirado antes do tempo real. */
const EXPIRY_SKEW_MS = 60_000;

/** Lê de forma síncrona o token atual (válido), fora do ciclo de render. */
export function getGoogleAccessToken(): string | null {
  const tokens = getPersistedSnapshot(EMPTY_TOKENS, GOOGLE_TOKENS_KEY);
  if (!tokens.accessToken || !tokens.expiresAt) return null;
  if (Date.now() > tokens.expiresAt - EXPIRY_SKEW_MS) return null;
  return tokens.accessToken;
}

/** `true` quando há um `accessToken` ainda válido. */
function isTokenValid(tokens: GoogleTokens): boolean {
  return Boolean(tokens.accessToken && tokens.expiresAt && Date.now() < tokens.expiresAt - EXPIRY_SKEW_MS);
}

export type UseGoogleAuthResult = {
  tokens: GoogleTokens;
  isConnected: boolean;
  /** `false` enquanto o request OAuth ainda não foi inicializado. */
  isReady: boolean;
  /** Abre o fluxo de login do Google. */
  connect: () => Promise<void>;
  /** Limpa os tokens persistidos (logout). */
  disconnect: () => void;
};

/**
 * Hook de autenticação Google. Deve ser usado dentro de um componente, pois o
 * `useAuthRequest` do Expo monta o request OAuth.
 */
export function useGoogleAuth(): UseGoogleAuthResult {
  const [tokens, setTokens] = usePersistedState<GoogleTokens>(EMPTY_TOKENS, GOOGLE_TOKENS_KEY);
  const clientIds = getGoogleClientIds();

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: clientIds.iosClientId,
    androidClientId: clientIds.androidClientId,
    webClientId: clientIds.webClientId,
    scopes: GOOGLE_CALENDAR_SCOPES,
  });

  useEffect(() => {
    if (response?.type !== 'success') return;

    const accessToken = response.authentication?.accessToken ?? null;
    if (!accessToken) return;

    const expiresInSec = response.authentication?.expiresIn ?? 3600;
    setTokens({
      accessToken,
      expiresAt: Date.now() + expiresInSec * 1000,
      account: tokens.account ?? null,
    });
  }, [response, setTokens, tokens.account]);

  const connect = useCallback(async () => {
    await promptAsync();
  }, [promptAsync]);

  const disconnect = useCallback(() => {
    setTokens({ ...EMPTY_TOKENS });
  }, [setTokens]);

  return {
    tokens,
    isConnected: isTokenValid(tokens),
    isReady: Boolean(request),
    connect,
    disconnect,
  };
}
