/**
 * Último nível de energia calculado, persistido entre sessões.
 *
 * A lista de tarefas é priorizada pelo servidor em função do nível de energia,
 * que entra na chave do cache. A coleta de saúde é assíncrona, então a tela
 * abria pedindo a lista com nível 0 e refazia a requisição assim que o valor
 * real chegava — duas idas ao servidor para a mesma lista.
 *
 * Guardando o último nível conhecido, a primeira requisição já sai com um valor
 * próximo do correto e a segunda deixa de acontecer na maioria das aberturas.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'energy_last_level_v1';

/** Nível inteiro (0-5) da sessão anterior, ou `null` na primeira execução. */
export async function loadLastEnergyLevel(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.min(Math.max(Math.round(parsed), 0), 5) : null;
  } catch {
    return null;
  }
}

export async function saveLastEnergyLevel(level: number): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, String(Math.round(level)));
  } catch {
    // Persistência falhou — só significa que a próxima abertura recomeça do 0.
  }
}
