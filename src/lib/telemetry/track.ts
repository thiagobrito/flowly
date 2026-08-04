/**
 * Registro de eventos.
 *
 * `track` é síncrono e barato: valida, sanitiza e delega para a fila. Só nomes
 * da allowlist passam, e as propriedades são reduzidas a valores simples e
 * curtos — texto livre do usuário nunca sai do dispositivo.
 */

import { TELEMETRY_EVENTS, type TelemetryEventName } from './events';
import { getSessionId } from './identity';
import { enqueue } from './queue';
import type { TelemetryProps } from './types';

/** Teto por evento: mantém o payload pequeno e previsível. */
const MAX_PROPS = 10;
const MAX_VALUE_LENGTH = 120;

const ALLOWED = new Set<string>(TELEMETRY_EVENTS);

let enabled = true;

function sanitizeProps(props: TelemetryProps | undefined): TelemetryProps | undefined {
  if (!props) return undefined;

  const result: TelemetryProps = {};
  for (const key of Object.keys(props).slice(0, MAX_PROPS)) {
    const value = props[key];
    if (typeof value === 'string') {
      result[key] = value.slice(0, MAX_VALUE_LENGTH);
    } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      result[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/** Registra um evento do funil. Nunca lança nem bloqueia a UI. */
export function track(name: TelemetryEventName, props?: TelemetryProps): void {
  if (!enabled || !ALLOWED.has(name)) return;

  try {
    enqueue({
      name,
      ts: new Date().toISOString(),
      session_id: getSessionId(),
      props: sanitizeProps(props),
    });
  } catch {
    // Telemetria jamais derruba um fluxo do usuário.
  }
}

/** Liga/desliga a coleta em runtime (ex.: testes, ambientes internos). */
export function setTelemetryEnabled(value: boolean): void {
  enabled = value;
}
