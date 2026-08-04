/**
 * # Telemetry library
 *
 * Eventos de produto do app, da primeira abertura até a compra. Existe para
 * responder duas perguntas: onde o funil perde gente e o que está falhando.
 *
 * Só nomes da allowlist (`events.ts`) são enviados e as propriedades são
 * valores simples — nada de e-mail, senha ou conteúdo de tarefa. A identidade
 * é um UUID gerado no dispositivo, sem qualquer identificador de anúncio; o
 * `userId` é resolvido no servidor a partir do token.
 *
 * ## Setup (uma vez, no boot)
 *
 * ```ts
 * import { initTelemetry } from '@/lib/telemetry';
 * initTelemetry();
 * ```
 *
 * ## Registrando eventos
 *
 * ```ts
 * import { track } from '@/lib/telemetry';
 *
 * track('paywall_viewed', { step_id: 'downsell', offering_id: 'downsell' });
 * ```
 *
 * O envio é em lote (a cada 15s, ao juntar 50 eventos ou ao sair do primeiro
 * plano) e tolerante a falhas: sem rede a fila espera, com backoff.
 *
 * ## Exports principais
 *
 * - `initTelemetry` — identidade, fila e captura de erros de rede
 * - `track` — registra um evento da allowlist
 * - `flushTelemetry` — força o envio (ex.: antes de um logout)
 * - `TELEMETRY_EVENTS` — allowlist de nomes
 */

import { loadIdentity, markFirstOpenSent } from './identity';
import { installNetworkTelemetry } from './network';
import { startQueue } from './queue';
import { track } from './track';

let initialized = false;

/**
 * Prepara a telemetria e registra a abertura do app. Idempotente — chamadas
 * extras não repetem eventos.
 */
export async function initTelemetry(): Promise<void> {
  if (initialized) return;
  initialized = true;

  installNetworkTelemetry();

  try {
    const identity = await loadIdentity();

    // Primeira execução depois da instalação: é o topo do funil no app.
    if (!identity.first_open_sent) {
      track('app_first_open');
      await markFirstOpenSent();
    }

    track('app_open');
    await startQueue();
  } catch {
    // Falha na identidade não pode impedir o app de abrir.
  }
}

export type { TelemetryEventName } from './events';
export { TELEMETRY_EVENTS } from './events';
export { getSessionId } from './identity';
export { normalizePath } from './network';
export { flush as flushTelemetry } from './queue';
export { setTelemetryEnabled, track } from './track';
export type { QueuedEvent, TelemetryBatch, TelemetryProps } from './types';
