/**
 * # Energia por dia na revisão semanal
 *
 * Reancorar o input em cada dia (`anchorInputToDay`) é o que faz os sete dias
 * mostrarem energias diferentes — sem isso, a revisão repete a curva de hoje
 * sete vezes com rótulos diferentes.
 */

import { localDateKey, startOfLocalDay } from '@/lib/date';
import { anchorInputToDay } from '@/lib/energy';
import { generateEnergyCurve } from '@/lib/energy/engine/flowlyEngine';
import type { FlowlyEngineInput } from '@/lib/energy/types';

const DAY_MS = 86_400_000;

/**
 * Reancora o input do motor no dia `dateKey`.
 *
 * Devolve `null` quando não há `wakeTime`: sem o horário de acordar o motor não
 * tem eixo circadiano e a curva do dia seria uma invenção.
 */
export function dayInputFor(input: FlowlyEngineInput | null, dateKey: string): FlowlyEngineInput | null {
  if (!input?.wakeTime) return null;
  return anchorInputToDay(input, dateKey);
}

/**
 * Energia média do dia acordado (0–100), amostrada de hora em hora.
 * Devolve 0 quando não há input suficiente para desenhar a curva.
 */
export function averageDayEnergy(input: FlowlyEngineInput | null): number {
  if (!input) return 0;

  const curve = generateEnergyCurve(input, undefined, { stepMinutes: 60 });
  if (curve.length === 0) return 0;

  return Math.round(curve.reduce((sum, point) => sum + point.energyScore, 0) / curve.length);
}

/** Os sete dias civis terminando em `anchor` (inclusive), em ordem crescente. */
export function weekDateKeys(anchor: Date = new Date()): string[] {
  const end = startOfLocalDay(localDateKey(anchor));

  return Array.from({ length: 7 }, (_, index) => localDateKey(new Date(end.getTime() - (6 - index) * DAY_MS)));
}
