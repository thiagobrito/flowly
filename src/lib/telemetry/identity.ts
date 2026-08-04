/**
 * Identidade anônima da telemetria.
 *
 * `device_id` é um UUID gerado na primeira execução e guardado no dispositivo —
 * não vem da loja nem de identificadores de anúncio, então não há atribuição
 * nem rastreamento entre apps. `session_id` vive apenas enquanto o processo
 * roda, permitindo separar aberturas diferentes.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const IDENTITY_KEY = 'telemetry_device_v1';

export type DeviceIdentity = {
  device_id: string;
  /** Evita repetir o evento de instalação a cada abertura. */
  first_open_sent: boolean;
};

const sessionId = Crypto.randomUUID();

let identity: DeviceIdentity | null = null;
let loading: Promise<DeviceIdentity> | null = null;

function createIdentity(): DeviceIdentity {
  return { device_id: Crypto.randomUUID(), first_open_sent: false };
}

async function writeIdentity(next: DeviceIdentity): Promise<void> {
  try {
    await AsyncStorage.setItem(IDENTITY_KEY, JSON.stringify(next));
  } catch {
    // Sem persistência a telemetria segue funcionando, só perde a continuidade.
  }
}

async function readIdentity(): Promise<DeviceIdentity> {
  try {
    const raw = await AsyncStorage.getItem(IDENTITY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DeviceIdentity>;
      if (typeof parsed.device_id === 'string' && parsed.device_id) {
        return { device_id: parsed.device_id, first_open_sent: Boolean(parsed.first_open_sent) };
      }
    }
  } catch {
    // Storage indisponível ou corrompido: começa uma identidade nova.
  }

  const created = createIdentity();
  await writeIdentity(created);
  return created;
}

/** Carrega (uma vez) a identidade persistida, criando-a se ainda não existir. */
export function loadIdentity(): Promise<DeviceIdentity> {
  if (identity) return Promise.resolve(identity);
  if (!loading) {
    loading = readIdentity().then((loaded) => {
      identity = loaded;
      return loaded;
    });
  }
  return loading;
}

/** Marca que o evento de primeira abertura já foi registrado. */
export async function markFirstOpenSent(): Promise<void> {
  const current = await loadIdentity();
  if (current.first_open_sent) return;
  identity = { ...current, first_open_sent: true };
  await writeIdentity(identity);
}

/** Identificador da execução atual do app. */
export function getSessionId(): string {
  return sessionId;
}

/** Versão do app declarada no `app.json` (fallback para desenvolvimento). */
export function getAppVersion(): string {
  return Constants.expoConfig?.version ?? 'unknown';
}

export const PLATFORM = Platform.OS;
