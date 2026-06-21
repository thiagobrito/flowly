/**
 * Tipos públicos da lib de Google Calendar.
 */

import type { PersistedRecord } from '@/lib/storage';

/** Tokens OAuth persistidos. `accessToken` nulo significa desconectado. */
export type GoogleTokens = PersistedRecord & {
  accessToken: string | null;
  /** Epoch (ms) em que o `accessToken` expira. */
  expiresAt: number | null;
  /** E-mail/identificação opcional da conta conectada (informativo). */
  account?: string | null;
  loaded?: boolean;
  lastUpdate?: string;
};

/** Mapa persistido `eventId -> taskId` para evitar importar o mesmo evento 2x. */
export type SyncMap = PersistedRecord & {
  /** Relação evento Google -> tarefa Flowly criada. */
  entries: Record<string, string>;
  /** ISO da última sincronização bem-sucedida. */
  lastSyncAt?: string | null;
  loaded?: boolean;
  lastUpdate?: string;
};

/** Instante de início/fim de um evento, como retornado pela Calendar API. */
export type GoogleEventDateTime = {
  /** Presente em eventos com horário definido (ISO 8601). */
  dateTime?: string;
  /** Presente em eventos de dia inteiro (`YYYY-MM-DD`). */
  date?: string;
  timeZone?: string;
};

/** Evento normalizado da Google Calendar API. */
export type GoogleCalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  status?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
};

/** Resposta da listagem de eventos da Calendar API. */
export type GoogleEventsResponse = {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
};

/** Resultado de uma sincronização. */
export type SyncResult = {
  created: number;
  skipped: number;
  failed: number;
  /** Mapa `eventId -> taskId` atualizado (inclui os já existentes). */
  map: Record<string, string>;
};
