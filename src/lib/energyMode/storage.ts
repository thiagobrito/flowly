import AsyncStorage from '@react-native-async-storage/async-storage';

import { localDateKey } from '@/lib/date';

import type { EnergyMode, EnergyModeState } from './types';

const STORAGE_KEY = 'energy_mode_v1';

function isMode(value: unknown): value is EnergyMode {
  return value === 'ideal' || value === 'low' || value === 'rushed';
}

/** Lê o modo do dia atual. Modos de dias anteriores são ignorados (expiram sozinhos). */
export async function loadEnergyModeForToday(): Promise<EnergyMode> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return 'ideal';

    const parsed = JSON.parse(raw) as Partial<EnergyModeState>;
    if (parsed.dateKey === localDateKey() && isMode(parsed.mode)) {
      return parsed.mode;
    }
    return 'ideal';
  } catch {
    return 'ideal';
  }
}

/** Persiste o modo para o dia civil atual. */
export async function saveEnergyModeForToday(mode: EnergyMode): Promise<void> {
  const state: EnergyModeState = { dateKey: localDateKey(), mode };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Persistência falhou — o modo ainda vale na sessão atual.
  }
}
