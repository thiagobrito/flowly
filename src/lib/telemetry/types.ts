/** Tipos públicos da lib de telemetria. */

import type { TelemetryEventName } from './events';

export type { TelemetryEventName } from './events';

/** Propriedades aceitas num evento: valores simples, nunca texto livre do usuário. */
export type TelemetryProps = Record<string, string | number | boolean | null>;

/** Evento na fila, ainda sem os dados do dispositivo (adicionados no envio). */
export type QueuedEvent = {
  name: TelemetryEventName;
  /** ISO do momento em que aconteceu (não do envio). */
  ts: string;
  session_id: string;
  props?: TelemetryProps;
};

/** Corpo enviado a `POST /events`: um envelope do dispositivo + os eventos. */
export type TelemetryBatch = {
  device_id: string;
  platform: string;
  app_version: string;
  events: QueuedEvent[];
};
