import { useCallback, useMemo } from 'react';

import { startOfLocalDay } from '@/lib/date';
import { anchorInputToDay, computeEnergyAtMoment, energyScoreToLevel, flowlyInputFromMetrics, useEnergyScore } from '@/lib/energy';

const HOUR_SLOT_STEP_MIN = 60;
const SLEEP_NEED_HOURS = 8;

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

  return {
    getLevel,
    hasData: hasPermissions && levelsByMinutes !== null,
    loading,
  };
}
