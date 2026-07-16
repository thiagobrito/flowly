/**
 * # Sleep log
 *
 * Sincroniza para o servidor os horários de sono **medidos pelo dispositivo**
 * (Apple Health / Health Connect): horário real de dormir/acordar, duração e
 * estágios da última noite, além do histórico de horas por noite disponível.
 *
 * Diferente do `sleepProfile/` (horários usuais informados pelo usuário), aqui
 * enviamos apenas o que o wearable/telefone de fato mediu. O envio é
 * best-effort: dispara na abertura do app e a cada retorno ao foreground
 * (`useSleepLogSync`, montado no shell autenticado), e em falha de rede é
 * enfileirado em `pendingSync` para reenvio automático.
 *
 * Segue o padrão lib-fina + hook do projeto (`sleepProfile/`, `pendingSync/`).
 */

import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { getHealthProvider } from '@/lib/energy/collectors';
import { isoDayKey } from '@/lib/energy/collectors/shared';
import type { HealthMetrics } from '@/lib/energy/types';
import { api, getAuthToken } from '@/lib/network';
import { usePendingSync } from '@/lib/pendingSync';

/** Endpoint dos registros de sono medidos no servidor (mesmo baseURL da `api`). */
const SYNC_PATH = '/sleep-log';

/** Mantém o lote enviado dentro da mesma janela do histórico coletado (14 noites). */
const MAX_HISTORY_NIGHTS = 30;

type EnqueueFn = (method: 'POST' | 'PUT', path: string, payload: unknown) => void;

/** Uma noite de sono medida pelo dispositivo, pronta para o servidor. */
export interface MeasuredSleepNight {
  /** Dia de acordar, `YYYY-MM-DD` (hora local). */
  date: string;
  /** ISO do início da última sessão de sono (dormir). */
  bedTime?: string | null;
  /** ISO do fim da última sessão de sono (acordar). */
  wakeTime?: string | null;
  sleepHours?: number | null;
  deepSleepMin?: number | null;
  remSleepMin?: number | null;
  sleepVariability?: number | null;
  /** Origem do dado: 'ios' (Apple Health) ou 'android' (Health Connect). */
  source?: string | null;
}

/**
 * Assinaturas já enviadas nesta sessão do app — evita reenviar a mesma noite a
 * cada foreground. Como o upsert do servidor é idempotente (chave userId+date),
 * um reenvio eventual entre sessões é inofensivo.
 */
const syncedSignatures = new Set<string>();

/** Evita coletas/envios concorrentes (o hook pode ser disparado em rajada). */
let collectInFlight = false;

/**
 * Monta o lote de noites a enviar a partir das métricas coletadas. Exige que a
 * última noite tenha horário medido de dormir **e** acordar — respeita o
 * "disponíveis": sem dado medido, nada é enviado. O histórico (só `sleepHours`
 * por noite) entra como complemento; a última noite sobrepõe com os campos
 * completos.
 */
function buildNights(metrics: HealthMetrics): MeasuredSleepNight[] {
  if (!metrics.bedTime || !metrics.wakeTime) return [];

  const source = getHealthProvider().platform;
  const mainDate = isoDayKey(metrics.wakeTime);
  const nights = new Map<string, MeasuredSleepNight>();

  (metrics.sleepHistory ?? []).forEach((night) => {
    nights.set(night.date, { date: night.date, sleepHours: night.sleepHours, source });
  });

  nights.set(mainDate, {
    date: mainDate,
    bedTime: metrics.bedTime,
    wakeTime: metrics.wakeTime,
    sleepHours: metrics.sleepHours,
    deepSleepMin: metrics.deepSleepMin,
    remSleepMin: metrics.remSleepMin,
    sleepVariability: metrics.sleepVariability,
    source,
  });

  return [...nights.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_HISTORY_NIGHTS);
}

/**
 * Envia as noites medidas ao servidor. Sem sessão autenticada ou sem dado
 * medido disponível, não faz nada. Em falha de rede, enfileira para reenvio.
 */
export async function syncMeasuredSleep(metrics: HealthMetrics, options: { enqueue?: EnqueueFn } = {}): Promise<void> {
  if (!getAuthToken()) return;

  const nights = buildNights(metrics);
  if (nights.length === 0) return;

  const signature = `${isoDayKey(metrics.wakeTime!)}|${metrics.bedTime}|${metrics.wakeTime}`;
  if (syncedSignatures.has(signature)) return;

  const payload = { nights };
  try {
    await api.post(SYNC_PATH, payload);
    syncedSignatures.add(signature);
  } catch {
    options.enqueue?.('POST', SYNC_PATH, payload);
  }
}

/**
 * Hook que sincroniza o sono medido na **abertura do app** e a cada retorno ao
 * foreground. Espelha `usePendingSyncFlush`: monte-o uma única vez no shell
 * autenticado. A coleta é tolerante a falha (sem permissão/indisponível apenas
 * não envia).
 */
export function useSleepLogSync(enabled: boolean): void {
  const { enqueue } = usePendingSync();
  const enqueueRef = useRef(enqueue);
  enqueueRef.current = enqueue;

  const run = useCallback(async () => {
    if (!enabled || !getAuthToken()) return;
    if (collectInFlight) return;
    collectInFlight = true;
    try {
      const metrics = await getHealthProvider().collect();
      await syncMeasuredSleep(metrics, { enqueue: enqueueRef.current });
    } catch {
      // Sem permissão de saúde / provedor indisponível: ignora silenciosamente.
    } finally {
      collectInFlight = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => subscription.remove();
  }, [enabled, run]);
}
