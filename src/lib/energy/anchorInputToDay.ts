import { localDateKey, startOfLocalDay } from '@/lib/date';

import type { FlowlyEngineInput } from './types';

/**
 * Reancora o input do motor em outro dia civil.
 *
 * O `FlowlyEngineInput` que o coletor devolve descreve **hoje**: `wakeTime` e
 * `bedTime` são instantes absolutos da noite mais recente. Usá-lo direto para
 * outro dia produz a curva de hoje com o rótulo de outro dia.
 *
 * O que é preservado é o horário de relógio de acordar/dormir — é o hábito do
 * usuário, o único dado que temos. O que é trocado é o que de fato variou: as
 * horas dormidas naquela noite e o histórico disponível até ali, que é o que
 * move a dívida de sono.
 */
export function anchorInputToDay(input: FlowlyEngineInput, day: string | Date): FlowlyEngineInput {
  if (!input.wakeTime) return input;

  const sourceWake = new Date(input.wakeTime);
  if (Number.isNaN(sourceWake.getTime())) return input;

  const targetDayStart = startOfLocalDay(day);
  const sourceDayStart = startOfLocalDay(sourceWake);
  const dateKey = localDateKey(targetDayStart);

  // Preserva o deslocamento em relação à meia-noite do dia de origem, então um
  // `bedTime` da noite anterior (deslocamento negativo) continua negativo.
  const shift = (iso: string) => new Date(targetDayStart.getTime() + (new Date(iso).getTime() - sourceDayStart.getTime())).toISOString();

  // Só as noites até o dia analisado: a dívida de sono de terça não pode ser
  // influenciada pelo que foi dormido na quinta.
  const history = (input.sleepHistory ?? []).filter((night) => night.date <= dateKey);
  const thatNight = history.find((night) => night.date === dateKey);
  const historyAverage = history.length > 0 ? history.reduce((sum, night) => sum + night.sleepHours, 0) / history.length : null;

  return {
    ...input,
    wakeTime: shift(input.wakeTime),
    bedTime: input.bedTime && !Number.isNaN(new Date(input.bedTime).getTime()) ? shift(input.bedTime) : null,
    sleepHistory: history,
    // Sem registro da noite, o histórico é a melhor estimativa disponível.
    lastNightSleepHours: thatNight?.sleepHours ?? historyAverage,
  };
}
