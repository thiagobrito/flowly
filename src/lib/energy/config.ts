import type { MetricKey, WeightTier } from './types';

/** Numeric weight assigned to each qualitative tier. */
export const WEIGHT_TIERS: Record<WeightTier, number> = {
  MUITO_ALTO: 5,
  ALTO: 4,
  MEDIO: 3,
  BAIXO: 2,
};

export interface MetricConfig {
  label: string;
  tier: WeightTier;
}

/** Tunable normalization ranges used when mapping raw signals to 0-100. */
export interface NormalizationRanges {
  /** Sleep duration (hours) that yields a full reservoir. */
  idealSleepHours: number;
  /** Local hour (decimal) considered the ideal wake-up time. */
  idealWakeHour: number;
  /** Tolerance (hours) around the ideal wake hour before the score decays fully. */
  wakeToleranceHours: number;
  /** Hours awake beyond which energy is considered fully depleted. */
  maxAwakeHours: number;
  /** HRV (ms) mapped to 0. */
  hrvFloor: number;
  /** HRV (ms) mapped to 100. */
  hrvCeil: number;
  /** Resting heart rate (bpm) mapped to 100 (best). */
  rhrBest: number;
  /** Resting heart rate (bpm) mapped to 0 (worst). */
  rhrWorst: number;
  /** Deep-sleep minutes considered ideal (mapped to 100). */
  deepIdealMin: number;
  /** REM-sleep minutes considered ideal (mapped to 100). */
  remIdealMin: number;
  /** Sleep-duration variability (hours std-dev) mapped to 0 (worst). */
  variabilityWorst: number;
  /** Optimal 7-day training load (minutes) mapped to the peak score. */
  trainingLoadOptimal: number;
  /** 7-day training load (minutes) considered overtraining (heavy penalty). */
  trainingLoadMax: number;
  /** Workout minutes today above which a workout starts adding fatigue. */
  workoutFatigueThresholdMin: number;
}

export interface EnergyConfig {
  metrics: Record<MetricKey, MetricConfig>;
  ranges: NormalizationRanges;
  /** Score thresholds (inclusive lower bounds) for the energy bands. */
  bands: {
    moderate: number;
    high: number;
  };
}

/**
 * Default configuration.
 *
 * Weights explicitly requested:
 *  - Horas de sono: Muito alto
 *  - Horário que acordou: Alto
 *  - Horário atual: Alto
 *  - Treino realizado hoje: Médio
 *
 * Remaining signals (HRV, RHR, deep/REM sleep, sleep variability, 7d load) use
 * sensible defaults and can be overridden per-call.
 */
export const defaultConfig: EnergyConfig = {
  metrics: {
    sleepHours: { label: 'Horas de sono', tier: 'MUITO_ALTO' },
    wakeTime: { label: 'Horário que acordou', tier: 'ALTO' },
    timeAwake: { label: 'Horário atual', tier: 'ALTO' },
    workoutToday: { label: 'Treino realizado hoje', tier: 'MEDIO' },
    hrv: { label: 'HRV', tier: 'ALTO' },
    restingHeartRate: {
      label: 'Frequência cardíaca em repouso',
      tier: 'MEDIO',
    },
    deepSleep: { label: 'Sono profundo', tier: 'MEDIO' },
    remSleep: { label: 'Sono REM', tier: 'MEDIO' },
    sleepVariability: { label: 'Variabilidade do sono', tier: 'MEDIO' },
    trainingLoad7d: {
      label: 'Carga de treino últimos 7 dias',
      tier: 'MEDIO',
    },
  },
  ranges: {
    idealSleepHours: 8,
    idealWakeHour: 6.5,
    wakeToleranceHours: 3,
    maxAwakeHours: 16,
    hrvFloor: 20,
    hrvCeil: 100,
    rhrBest: 45,
    rhrWorst: 85,
    deepIdealMin: 90,
    remIdealMin: 110,
    variabilityWorst: 2,
    trainingLoadOptimal: 300,
    trainingLoadMax: 900,
    workoutFatigueThresholdMin: 75,
  },
  bands: {
    moderate: 34,
    high: 67,
  },
};
