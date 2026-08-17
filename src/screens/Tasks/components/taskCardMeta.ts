/**
 * Metadados que o `TaskCard` mostra na coluna da esquerda e nos chips.
 *
 * Fica fora do componente porque o `TaskCard` importa `taskReminders`, que
 * importa `expo-notifications`: um teste do rótulo "Energia alta" acabaria
 * tendo que mockar a pilha de notificações inteira para chegar até a string.
 */

import { localDateKey } from '@/lib/date';
import { ENERGY_BAND_LABEL, type EnergyBandKey, energyBandKey } from '@/lib/theme';

import { getTaskSlot } from '../../Calendar/scheduleSync';
import type { Task } from '../../NewTask/data';

/**
 * Energia exigida pela tarefa (0–5) traduzida para a mesma faixa do score.
 *
 * O motor converte score 0–100 em nível 0–5 dividindo por 20; multiplicar de
 * volta faz a exigência da tarefa cair nos mesmos cortes de `ENERGY_THRESHOLDS`
 * que a curva do dia usa. Sem isso, "alta" no card e "alta" no gráfico seriam
 * duas escalas parecidas com nomes iguais.
 */
export function taskEnergyBand(level: number): EnergyBandKey {
  return energyBandKey(level * 20);
}

/** `energia alta` → `Energia alta`. Só a primeira letra: não é um título. */
export function energyChipLabel(level: number): string {
  const label = ENERGY_BAND_LABEL[taskEnergyBand(level)];
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** `HH:MM` do bloco agendado para hoje, ou `null` quando a tarefa não tem hora. */
export function startTimeLabel(task: Task, dateKey = localDateKey()): string | null {
  const slot = getTaskSlot(task, dateKey);
  if (!slot) return null;

  const date = new Date(slot.dateTime);
  if (Number.isNaN(date.getTime())) return null;

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
