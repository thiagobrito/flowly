/**
 * Conversão de eventos do Google Calendar em payloads de tarefa do Flowly.
 *
 * Funções puras (sem rede/storage) para facilitar os testes.
 */

import { APP_TIME_ZONE, localDateKey } from '@/lib/date';
import type { FrequencyConfig, NewTaskPayload } from '@/screens/NewTask/data';

import { DEFAULT_EVENT_AREA, DEFAULT_EVENT_LEVEL } from './config';
import type { GoogleCalendarEvent } from './types';

/** `HH:mm` locais (fuso do app) a partir de um instante. */
function toLocalTimeHM(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

/** Frequência `once` (data + hora locais) a partir de um instante ISO. */
function onceFrequencyFromISO(dateTimeISO: string): Extract<FrequencyConfig, { kind: 'once' }> {
  const date = new Date(dateTimeISO);
  return {
    kind: 'once',
    date: localDateKey(date),
    time: toLocalTimeHM(date),
  };
}

/** Instante de início do evento (apenas eventos com horário definido). */
export function getEventStartISO(event: GoogleCalendarEvent): string | null {
  const dateTime = event.start?.dateTime;
  if (!dateTime) return null;
  const parsed = new Date(dateTime);
  return Number.isNaN(parsed.getTime()) ? null : dateTime;
}

/** Duração do evento em minutos (default 30 quando indeterminável). */
export function getEventDurationMin(event: GoogleCalendarEvent): number {
  const start = event.start?.dateTime;
  const end = event.end?.dateTime;
  if (!start || !end) return 30;

  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return 30;

  return Math.round((endMs - startMs) / 60_000);
}

/**
 * Converte um evento em payload de tarefa, ou `null` quando o evento não tem
 * horário definido (ex.: eventos de dia inteiro), que não viram tarefa agendada.
 */
export function eventToTaskPayload(event: GoogleCalendarEvent): NewTaskPayload | null {
  const startISO = getEventStartISO(event);
  if (!startISO) return null;

  return {
    name: event.summary?.trim() || 'Evento Google',
    energy: DEFAULT_EVENT_LEVEL,
    impact: DEFAULT_EVENT_LEVEL,
    frequency: onceFrequencyFromISO(startISO),
    area: DEFAULT_EVENT_AREA,
    subtasks: [],
    estimatedMinutes: getEventDurationMin(event),
  };
}
