import type { FlowlyEngineConfig } from './flowlyConfig';
import { defaultFlowlyConfig } from './flowlyConfig';
import { clamp } from './normalize';

/**
 * Recovery Score — physiological readiness for the day.
 *
 *   recovery = 0.40 * sleepQuality
 *            + 0.30 * sleepDebtScore
 *            + 0.20 * hrvScore
 *            + 0.10 * restingHeartRateScore
 *
 * Missing signals are excluded and the remaining weights are re-normalized,
 * so partial data still yields a meaningful 0-100 score. With no signals at
 * all the engine returns a neutral score (50).
 */

/**
 * Sleep quality from last night's duration vs. the personal sleep need.
 * Linear up to the need (6h/8h -> 75); oversleeping applies a mild penalty,
 * since very long sleep correlates with lower next-day alertness.
 */
export const normalizeSleepQuality = (lastNightSleepHours: number, sleepNeedHours: number, oversleepPenaltyPerHour: number = defaultFlowlyConfig.recovery.oversleepPenaltyPerHour): number => {
  if (sleepNeedHours <= 0) return 0;
  if (lastNightSleepHours <= sleepNeedHours) {
    return clamp((lastNightSleepHours / sleepNeedHours) * 100);
  }
  return clamp(100 - (lastNightSleepHours - sleepNeedHours) * oversleepPenaltyPerHour);
};

/**
 * HRV normalization on a log scale (HRV is approximately log-normally
 * distributed across the population):
 *
 *   score = 100 * (ln(hrv) - ln(floor)) / (ln(ceil) - ln(floor)), clamped
 *
 * Defaults: 20 ms -> 0, 100 ms -> 100.
 */
export const normalizeHrv = (hrvMs: number, floorMs: number = defaultFlowlyConfig.recovery.hrvFloorMs, ceilMs: number = defaultFlowlyConfig.recovery.hrvCeilMs): number => {
  if (hrvMs <= 0 || ceilMs <= floorMs || floorMs <= 0) return 0;
  return clamp((100 * (Math.log(hrvMs) - Math.log(floorMs))) / (Math.log(ceilMs) - Math.log(floorMs)));
};

/**
 * Resting heart rate normalization (lower is better), linear:
 * 45 bpm -> 100, 85 bpm -> 0.
 */
export const normalizeRestingHeartRate = (bpm: number, bestBpm: number = defaultFlowlyConfig.recovery.rhrBestBpm, worstBpm: number = defaultFlowlyConfig.recovery.rhrWorstBpm): number => {
  if (worstBpm === bestBpm) return 0;
  return clamp((100 * (worstBpm - bpm)) / (worstBpm - bestBpm));
};

export interface RecoveryInput {
  lastNightSleepHours: number | null;
  /** Normalized sleep-debt score (0-100), or null when no history exists. */
  sleepDebtScore: number | null;
  hrvMs: number | null;
  restingHeartRate: number | null;
}

/** Weighted recovery score (0-100) with automatic re-normalization. */
export const computeRecoveryScore = (input: RecoveryInput, sleepNeedHours: number, config: FlowlyEngineConfig = defaultFlowlyConfig): number => {
  const r = config.recovery;
  const parts: { weight: number; value: number }[] = [];

  if (input.lastNightSleepHours != null) {
    parts.push({
      weight: r.weights.sleepQuality,
      value: normalizeSleepQuality(input.lastNightSleepHours, sleepNeedHours, r.oversleepPenaltyPerHour),
    });
  }
  if (input.sleepDebtScore != null) {
    parts.push({ weight: r.weights.sleepDebt, value: clamp(input.sleepDebtScore) });
  }
  if (input.hrvMs != null) {
    parts.push({ weight: r.weights.hrv, value: normalizeHrv(input.hrvMs, r.hrvFloorMs, r.hrvCeilMs) });
  }
  if (input.restingHeartRate != null) {
    parts.push({
      weight: r.weights.restingHeartRate,
      value: normalizeRestingHeartRate(input.restingHeartRate, r.rhrBestBpm, r.rhrWorstBpm),
    });
  }

  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
  if (totalWeight <= 0) return r.neutralScore;

  const weighted = parts.reduce((sum, part) => sum + part.value * part.weight, 0);
  return clamp(weighted / totalWeight);
};
