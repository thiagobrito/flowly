/**
 * Leitura de eventos da Google Calendar API.
 */

import { authHeader, getGoogleCalendarClient } from './client';
import { DEFAULT_SYNC_WINDOW_DAYS } from './config';
import type { GoogleCalendarEvent, GoogleEventsResponse } from './types';

/** Janela de tempo (ISO) para a busca de eventos. */
export type EventWindow = {
  timeMin: string;
  timeMax: string;
};

/** Constrói a janela padrão: de agora até `+windowDays`. */
export function defaultEventWindow(windowDays = DEFAULT_SYNC_WINDOW_DAYS, now = new Date()): EventWindow {
  const timeMin = now.toISOString();
  const end = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);
  return { timeMin, timeMax: end.toISOString() };
}

/**
 * Lista eventos do calendário primário no intervalo informado.
 *
 * `singleEvents=true` expande eventos recorrentes em instâncias individuais e
 * `orderBy=startTime` garante a ordem cronológica. Cancelados são filtrados.
 */
export async function listUpcomingEvents(token: string, window: EventWindow): Promise<GoogleCalendarEvent[]> {
  const response = await getGoogleCalendarClient().get<GoogleEventsResponse>('/calendars/primary/events', {
    headers: authHeader(token),
    params: {
      timeMin: window.timeMin,
      timeMax: window.timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    },
  });

  const items = Array.isArray(response.items) ? response.items : [];
  return items.filter((event) => event.id && event.status !== 'cancelled');
}
