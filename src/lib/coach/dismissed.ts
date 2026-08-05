/**
 * Sugestões dispensadas, persistidas por dia civil.
 *
 * Sem persistência, "Agora não" só vale até o próximo remount da tela — a
 * sugestão recusada volta ao trocar de aba, e a lista parece instável. O
 * registro expira sozinho na virada do dia: dispensar hoje não deve silenciar a
 * mesma sugestão amanhã, quando o contexto já é outro.
 *
 * Segue o mesmo formato de `@/lib/energyMode/storage`: um único registro com o
 * `dateKey`, descartado quando o dia não bate.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { localDateKey } from '@/lib/date';

const STORAGE_KEY = 'coach_dismissed_v1';

type DismissedState = {
  dateKey: string;
  ids: string[];
};

/** Ids dispensados hoje. Registros de outros dias são ignorados. */
export async function loadDismissedForToday(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Partial<DismissedState>;
    if (parsed.dateKey !== localDateKey() || !Array.isArray(parsed.ids)) return [];

    return parsed.ids.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

/** Persiste a lista completa de dispensadas do dia. */
export async function saveDismissedForToday(ids: string[]): Promise<void> {
  const state: DismissedState = { dateKey: localDateKey(), ids: [...new Set(ids)] };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Persistência falhou — a dispensa ainda vale na sessão atual.
  }
}
