/**
 * Domain types for the Energy Score library.
 *
 * Flow: Apple Health / Health Connect -> Coletor de Dados (collectors)
 *       -> Energy Engine -> Energy Score (0-100).
 */

export type WeightTier = 'MUITO_ALTO' | 'ALTO' | 'MEDIO' | 'BAIXO';

export interface DateRange {
  /** ISO-8601 string. */
  startDate: string;
  /** ISO-8601 string. */
  endDate: string;
}

/**
 * Normalized health signals collected from the platform health provider.
 * Any field can be `null` when the underlying data is unavailable; the engine
 * gracefully excludes missing signals and re-normalizes the remaining weights.
 */
export interface HealthMetrics {
  /** Total sleep duration of the last main sleep session, in hours. */
  sleepHours: number | null;
  /** ISO timestamp of when the user woke up from the last sleep session. */
  wakeTime: string | null;
  /** ISO timestamp of "now" (reference time used for circadian/time-awake math). */
  now: string;
  /** Whether the user performed a workout today. */
  workoutToday: boolean;
  /** Total workout minutes performed today (intensity proxy), if known. */
  workoutMinutesToday: number | null;
  /** Average heart-rate variability of the last night, in milliseconds. */
  hrvMs: number | null;
  /** Resting heart rate, in beats per minute. */
  restingHeartRate: number | null;
  /** Deep-sleep minutes of the last sleep session. */
  deepSleepMin: number | null;
  /** REM-sleep minutes of the last sleep session. */
  remSleepMin: number | null;
  /** Standard deviation of sleep duration over the last nights, in hours. */
  sleepVariability: number | null;
  /** Accumulated training load (minutes) over the last 7 days. */
  trainingLoad7d: number | null;
}

export type MetricKey = 'sleepHours' | 'wakeTime' | 'timeAwake' | 'workoutToday' | 'hrv' | 'restingHeartRate' | 'deepSleep' | 'remSleep' | 'sleepVariability' | 'trainingLoad7d';

/** A single normalized contribution to the final Energy Score. */
export interface SubScore {
  key: MetricKey;
  label: string;
  /** Normalized value in the 0-100 range. */
  value: number;
  /** Numeric weight derived from the configured tier. */
  weight: number;
  tier: WeightTier;
  /** Whether the source metric was available and contributed to the score. */
  available: boolean;
}

export type EnergyBand = 'low' | 'moderate' | 'high';

export interface EnergyScore {
  /** Final Energy Score, integer in the 0-100 range. */
  score: number;
  band: EnergyBand;
  /** Per-metric breakdown for transparency / UI. */
  breakdown: SubScore[];
  /** ISO timestamp of when the score was computed. */
  computedAt: string;
}
