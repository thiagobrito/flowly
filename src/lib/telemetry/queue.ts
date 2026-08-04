/**
 * Fila de envio dos eventos.
 *
 * Nada é enviado na hora: os eventos ficam em memória (com espelho no
 * dispositivo) e sobem em lote. Isso mantém o custo por evento perto de zero na
 * UI e faz a telemetria sobreviver a falta de rede — nenhum erro daqui pode
 * escapar para o app.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

import { api } from '@/lib/network';

import { getAppVersion, loadIdentity, PLATFORM } from './identity';
import type { QueuedEvent, TelemetryBatch } from './types';

const QUEUE_KEY = 'telemetry_queue_v1';

/** Mesmo limite aceito pelo servidor em `POST /events`. */
const MAX_BATCH = 50;

/** Teto da fila: eventos mais antigos são descartados primeiro. */
const MAX_QUEUE = 200;

const FLUSH_INTERVAL_MS = 15_000;
const BASE_RETRY_MS = 10_000;
const MAX_RETRY_MS = 5 * 60_000;

let queue: QueuedEvent[] = [];
let started = false;
let flushing = false;
let retryAfter = 0;
let retryDelayMs = BASE_RETRY_MS;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

async function persistNow(): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Sem espelho em disco a fila continua valendo só para esta execução.
  }
}

/** Agrupa gravações: rajadas de eventos não viram rajadas de escrita. */
function schedulePersist(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistNow();
  }, 1000);
}

async function restore(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as QueuedEvent[];
    if (Array.isArray(parsed)) queue = parsed.slice(-MAX_QUEUE).concat(queue);
  } catch {
    // Fila corrompida: descarta e segue.
  }
}

/** Envia o próximo lote. Silencioso em qualquer falha. */
export async function flush(): Promise<void> {
  if (flushing || queue.length === 0) return;
  if (Date.now() < retryAfter) return;

  flushing = true;
  const batch = queue.slice(0, MAX_BATCH);

  try {
    const { device_id: deviceId } = await loadIdentity();
    const payload: TelemetryBatch = {
      device_id: deviceId,
      platform: PLATFORM,
      app_version: getAppVersion(),
      events: batch,
    };

    await api.post('/events', payload);

    queue = queue.slice(batch.length);
    retryDelayMs = BASE_RETRY_MS;
    retryAfter = 0;
    await persistNow();
  } catch {
    // Servidor fora do ar ou sem rede: segura o lote e espalha as tentativas.
    retryAfter = Date.now() + retryDelayMs;
    retryDelayMs = Math.min(retryDelayMs * 2, MAX_RETRY_MS);
  } finally {
    flushing = false;
  }
}

/** Adiciona um evento à fila. Nunca lança. */
export function enqueue(event: QueuedEvent): void {
  queue.push(event);
  if (queue.length > MAX_QUEUE) queue = queue.slice(queue.length - MAX_QUEUE);

  schedulePersist();
  if (queue.length >= MAX_BATCH) flush();
}

/** Liga o envio periódico e o flush ao sair do primeiro plano. Idempotente. */
export async function startQueue(): Promise<void> {
  if (started) return;
  started = true;

  await restore();

  setInterval(() => {
    flush();
  }, FLUSH_INTERVAL_MS);

  AppState.addEventListener('change', (state) => {
    if (state === 'active') return;
    persistNow();
    flush();
  });

  flush();
}

/** Estado interno da fila. Uso em testes. */
export function getQueueSnapshotForTests(): QueuedEvent[] {
  return [...queue];
}

/** Zera a fila e o agendamento. Uso em testes. */
export function resetQueueForTests(): void {
  queue = [];
  started = false;
  flushing = false;
  retryAfter = 0;
  retryDelayMs = BASE_RETRY_MS;
}
