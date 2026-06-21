/**
 * # Google Calendar library
 *
 * Sincroniza eventos do Google Calendar para o Flowly (pull): conecta a conta
 * Google via OAuth (`expo-auth-session`), lê os eventos da Calendar API e cria
 * uma tarefa do Flowly para cada evento agendado (via `PUT /tasks`).
 *
 * Ponto único de uso — telas/serviços não importam `expo-auth-session` nem
 * chamam a Google API direto.
 *
 * ## Configuração
 *
 * Defina os Client IDs do OAuth no `.env` (veja o README do projeto, seção
 * "Integração com Google Calendar"):
 *
 * ```
 * EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
 * EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
 * EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
 * ```
 *
 * ## Uso na UI (hook)
 *
 * ```tsx
 * import { useGoogleCalendarSync } from '@/lib/googleCalendar';
 *
 * function Integration() {
 *   const { isConnected, pending, connect, syncNow, disconnect } = useGoogleCalendarSync();
 *
 *   // connect() abre o OAuth e, ao concluir, importa os eventos automaticamente.
 *   // syncNow() reexecuta a importação (conta já conectada).
 *   // disconnect() limpa os tokens.
 * }
 * ```
 *
 * ## Uso programático
 *
 * ```ts
 * import { getGoogleAccessToken, syncEventsToTasks } from '@/lib/googleCalendar';
 *
 * const token = getGoogleAccessToken();
 * if (token) {
 *   const result = await syncEventsToTasks({ token });
 *   console.log(result.created, result.skipped, result.failed);
 * }
 * ```
 *
 * ## Exports principais
 *
 * - `useGoogleCalendarSync` — hook de conexão + importação (para a UI)
 * - `useGoogleAuth` / `getGoogleAccessToken` — OAuth e leitura síncrona do token
 * - `syncEventsToTasks` — importa eventos como tarefas
 * - `listUpcomingEvents` / `defaultEventWindow` — leitura crua de eventos
 * - `eventToTaskPayload` — mapeamento evento -> payload de tarefa
 * - `getGoogleClientIds` / `hasGoogleClientIds` — config do OAuth
 * - Tipos: `GoogleCalendarEvent`, `GoogleTokens`, `SyncMap`, `SyncResult`, etc.
 */

export type { UseGoogleAuthResult } from './auth';
export { getGoogleAccessToken, useGoogleAuth } from './auth';
export type { GoogleClientIds } from './config';
export { DEFAULT_EVENT_AREA, DEFAULT_EVENT_LEVEL, DEFAULT_SYNC_WINDOW_DAYS, getGoogleClientIds, GOOGLE_CALENDAR_BASE_URL, GOOGLE_CALENDAR_SCOPES, hasGoogleClientIds } from './config';
export type { EventWindow } from './events';
export { defaultEventWindow, listUpcomingEvents } from './events';
export type { UseGoogleCalendarSyncResult } from './hooks/useGoogleCalendarSync';
export { useGoogleCalendarSync } from './hooks/useGoogleCalendarSync';
export { eventToTaskPayload, getEventDurationMin, getEventStartISO } from './mapping';
export { syncEventsToTasks } from './sync';
export type { GoogleCalendarEvent, GoogleEventDateTime, GoogleEventsResponse, GoogleTokens, SyncMap, SyncResult } from './types';
