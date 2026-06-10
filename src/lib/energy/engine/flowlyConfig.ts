/**
 * Tunable parameters of the Flowly Energy Engine.
 *
 * The model is inspired by RISE Sleep, circadian-rhythm research, sleep-debt
 * research and SAFTE-style fatigue modeling, simplified for a consumer
 * productivity app. Every constant below is a model parameter, not a magic
 * number: tweaking them reshapes the daily energy curve without touching the
 * engine code.
 */

/** A Gaussian bump (or dip) on the circadian curve, in hours-awake space. */
export interface CircadianWave {
  /** Hours after wake at which the wave peaks (or troughs). */
  centerHoursAwake: number;
  /** Gaussian standard deviation, in hours (controls how wide the wave is). */
  widthHours: number;
  /** Signed contribution at the center, in score points (negative = dip). */
  amplitude: number;
}

export interface FlowlyEngineConfig {
  /** Sleep need used when the input does not provide a personal value. */
  defaultSleepNeedHours: number;
  sleepDebt: {
    /** Rolling window over which daily deficits accumulate. */
    windowDays: number;
    /** Debt (hours) at which the sleep-debt score reaches 0. */
    maxDebtHours: number;
  };
  circadian: {
    /** Resting alertness level around which the waves oscillate. */
    baseline: number;
    /** Highest cognitive performance, 2-4h after waking. */
    morningPeak: CircadianWave;
    /** Post-lunch dip, 6-8h after waking. */
    afternoonDip: CircadianWave;
    /** Secondary productivity window, 8-11h after waking. */
    secondPeak: CircadianWave;
    /** Gradual decline toward bedtime, starting 12h+ after waking. */
    eveningDecline: {
      /** Hours awake at which the decline starts. */
      startHoursAwake: number;
      /** Total points removed by the time the user reaches bedtime. */
      depth: number;
    };
    /** Extra decay (points/hour) applied for each hour awake past bedtime. */
    postBedtimeDecayPerHour: number;
    /** Local hour assumed for the wake-up when no wakeTime is available. */
    fallbackWakeHour: number;
    /** Bounds for the wake -> bedtime span used by the evening decline. */
    minDayLengthHours: number;
    maxDayLengthHours: number;
  };
  inertia: {
    /** How long sleep inertia lasts after waking, in hours (90 min). */
    durationHours: number;
    /** Penalty (score points) applied at the exact moment of waking. */
    maxPenalty: number;
  };
  recovery: {
    /** Relative weights of each recovery signal (re-normalized when missing). */
    weights: {
      sleepQuality: number;
      sleepDebt: number;
      hrv: number;
      restingHeartRate: number;
    };
    /** HRV (ms) mapped to 0 on the log-linear normalization. */
    hrvFloorMs: number;
    /** HRV (ms) mapped to 100 on the log-linear normalization. */
    hrvCeilMs: number;
    /** Resting heart rate (bpm) mapped to 100 (best). */
    rhrBestBpm: number;
    /** Resting heart rate (bpm) mapped to 0 (worst). */
    rhrWorstBpm: number;
    /** Points removed per hour slept beyond the personal sleep need. */
    oversleepPenaltyPerHour: number;
    /** Score returned when no recovery signal is available at all. */
    neutralScore: number;
  };
  /** Score thresholds (inclusive lower bounds) for the energy bands. */
  bands: {
    moderate: number;
    high: number;
  };
}

export const defaultFlowlyConfig: FlowlyEngineConfig = {
  defaultSleepNeedHours: 8,
  sleepDebt: {
    windowDays: 14,
    maxDebtHours: 20,
  },
  circadian: {
    baseline: 58,
    morningPeak: { centerHoursAwake: 3, widthHours: 1.5, amplitude: 32 },
    afternoonDip: { centerHoursAwake: 7, widthHours: 1.3, amplitude: -20 },
    secondPeak: { centerHoursAwake: 9.5, widthHours: 1.6, amplitude: 22 },
    eveningDecline: { startHoursAwake: 12, depth: 42 },
    postBedtimeDecayPerHour: 6,
    fallbackWakeHour: 7,
    minDayLengthHours: 12,
    maxDayLengthHours: 20,
  },
  inertia: {
    durationHours: 1.5,
    maxPenalty: 30,
  },
  recovery: {
    weights: {
      sleepQuality: 0.4,
      sleepDebt: 0.3,
      hrv: 0.2,
      restingHeartRate: 0.1,
    },
    hrvFloorMs: 20,
    hrvCeilMs: 100,
    rhrBestBpm: 45,
    rhrWorstBpm: 85,
    oversleepPenaltyPerHour: 5,
    neutralScore: 50,
  },
  bands: {
    moderate: 34,
    high: 67,
  },
};
