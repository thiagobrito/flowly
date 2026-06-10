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

/** One night of sleep within the rolling history window. */
export interface SleepNight {
  /** Local day of the wake-up, formatted `YYYY-MM-DD`. */
  date: string;
  /** Total asleep time for that night, in hours. */
  sleepHours: number;
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
  /** ISO timestamp of when the last main sleep session started (bedtime). */
  bedTime: string | null;
  /** Per-night sleep totals across the collection window, ascending by date. */
  sleepHistory: SleepNight[] | null;
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

/* ------------------------------------------------------------------------ */
/* Flowly Energy Engine (RISE / SAFTE-inspired)                              */
/* ------------------------------------------------------------------------ */

/**
 * Input of the Flowly Energy Engine.
 *
 * The engine estimates the user's *biological capacity to perform meaningful
 * work* at a given moment, combining sleep debt, circadian rhythm, sleep
 * inertia and physiological recovery.
 */
export interface FlowlyEngineInput {
  /** Personal sleep requirement in hours. Defaults to the configured value (8h). */
  sleepNeedHours?: number;
  /** Rolling sleep history (ideally the last 14 nights). May be empty. */
  sleepHistory: SleepNight[];
  /** Duration of the last main sleep session, in hours. */
  lastNightSleepHours: number | null;
  /** ISO timestamp of the last wake-up. */
  wakeTime: string | null;
  /** ISO timestamp of the last bedtime (or tonight's target bedtime). */
  bedTime: string | null;
  /** Average HRV of the last night, in milliseconds. */
  hrvMs: number | null;
  /** Resting heart rate, in beats per minute. */
  restingHeartRate: number | null;
}

/** Intermediate components that produce the final Flowly energy score. */
export interface FlowlyEnergyComponents {
  /** Sleep need used by the computation, in hours. */
  sleepNeedHours: number;
  /** Accumulated sleep debt over the rolling window, in hours. */
  sleepDebtHours: number;
  /** Normalized sleep-debt score (0-100; 100 = no debt). */
  sleepDebtScore: number;
  /** Circadian alertness at the evaluated moment (0-100). */
  circadianEnergy: number;
  /** Sleep-inertia penalty applied at the evaluated moment (0-30 points). */
  sleepInertiaPenalty: number;
  /** Physiological recovery score (0-100). */
  recoveryScore: number;
  /** Hours awake at the evaluated moment. */
  hoursAwake: number;
}

/** Full result of the Flowly Energy Engine for a single moment in time. */
export interface FlowlyEnergyResult {
  /** Final energy score, integer in the 0-100 range (0 = exhausted, 100 = peak). */
  energyScore: number;
  /** Final energy score, integer in the 0-100 range (0 = exhausted, 100 = peak). */
  doubleEnergyScore: number;
  /** Same energy expressed on the 0-5 scale used by the task engine. */
  energyLevel: number;
  band: EnergyBand;
  components: FlowlyEnergyComponents;
  /** ISO timestamp of the evaluated moment. */
  computedAt: string;
}

/** One sample of the predicted energy curve across the day. */
export interface EnergyCurvePoint {
  /** ISO timestamp of the sample. */
  time: string;
  /** Hours awake at the sample. */
  hoursAwake: number;
  /** Predicted energy score (0-100). */
  energyScore: number;
}
