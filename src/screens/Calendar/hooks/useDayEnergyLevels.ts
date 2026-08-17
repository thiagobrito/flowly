import { useCallback, useMemo } from 'react';

import { startOfLocalDay } from '@/lib/date';
import { anchorInputToDay, computeEnergyAtMoment, energyScoreToLevel, flowlyInputFromMetrics, useEnergyScore } from '@/lib/energy';

const HOUR_SLOT_STEP_MIN = 60;
const SLEEP_NEED_HOURS = 8;

/** Horas em que faz sentido marcar pico ou queda: fora disso o usuário dorme. */
const AWAKE_START_MIN = 6 * 60;
const AWAKE_END_MIN = 23 * 60;

export type DayEnergyExtremes = {
  /** Minuto do slot de maior energia do dia acordado. */
  peakMinutes: number;
  /** Minuto do slot de menor energia do dia acordado. */
  dipMinutes: number;
};

/**
 * Slots de maior e menor energia entre as horas acordadas.
 *
 * Sai do mesmo mapa que tinge a grade em vez de `findPeakWindow`, que reamostra
 * a curva a cada 30 min a partir do horário de acordar. Duas amostragens
 * diferentes na mesma tela colocariam o marcador "PICO" numa faixa que não é a
 * mais verde da grade — e o usuário acredita no que vê, não no cálculo.
 */
function findExtremes(levels: Map<number, number>): DayEnergyExtremes | null {
  let peak: { minutes: number; level: number } | null = null;
  let dip: { minutes: number; level: number } | null = null;

  const awake = [...levels].filter(([minutes]) => minutes >= AWAKE_START_MIN && minutes <= AWAKE_END_MIN);

  for (const [minutes, level] of awake) {
    if (!peak || level > peak.level) peak = { minutes, level };
    if (!dip || level < dip.level) dip = { minutes, level };
  }

  if (!peak || !dip || peak.minutes === dip.minutes) return null;
  return { peakMinutes: peak.minutes, dipMinutes: dip.minutes };
}

/** Pré-calcula níveis de energia (0–5) para cada slot horário do dia. */
export function useDayEnergyLevels(visibleDate: string) {
  const { metrics, loading, hasPermissions } = useEnergyScore();

  const levelsByMinutes = useMemo(() => {
    if (!metrics) return null;

    const day = startOfLocalDay(visibleDate);
    const dayInput = anchorInputToDay(flowlyInputFromMetrics(metrics, SLEEP_NEED_HOURS), day);
    const map = new Map<number, number>();

    for (let minutes = 0; minutes < 24 * 60; minutes += HOUR_SLOT_STEP_MIN) {
      const moment = new Date(day.getTime() + minutes * 60_000);
      const { doubleEnergyScore } = computeEnergyAtMoment(dayInput, moment.toISOString());
      map.set(minutes, energyScoreToLevel(doubleEnergyScore));
    }

    return map;
  }, [metrics, visibleDate]);

  const getLevel = useCallback(
    (minutes: number): number | undefined => {
      if (!levelsByMinutes) return undefined;
      return levelsByMinutes.get(minutes);
    },
    [levelsByMinutes],
  );

  const extremes = useMemo(() => (levelsByMinutes ? findExtremes(levelsByMinutes) : null), [levelsByMinutes]);

  return {
    getLevel,
    extremes,
    hasData: hasPermissions && levelsByMinutes !== null,
    loading,
  };
}
