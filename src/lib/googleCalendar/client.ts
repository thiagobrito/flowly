/**
 * Cliente HTTP isolado para a Google Calendar API, sobre a lib de network.
 *
 * O token é injetado por requisição (não fica preso ao client), o que permite
 * reutilizar a mesma instância após reconectar/renovar a conta.
 */

import { createHttpClient, type HttpClient } from '@/lib/network';

import { GOOGLE_CALENDAR_BASE_URL } from './config';

let client: HttpClient | null = null;

/** Retorna (criando sob demanda) o client compartilhado da Calendar API. */
export function getGoogleCalendarClient(): HttpClient {
  if (!client) {
    client = createHttpClient({ baseURL: GOOGLE_CALENDAR_BASE_URL });
  }
  return client;
}

/** Header `Authorization: Bearer <token>` para as chamadas autenticadas. */
export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
