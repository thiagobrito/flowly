import type { EnergyConfig } from '../config';
import { WEIGHT_TIERS } from '../config';
import type { HealthMetrics, MetricKey, SubScore } from '../types';
import { clamp, linear } from './normalize';
import { circadianAlertness, sleepReservoirScore, timeAwakeScore, wakeAlignmentScore } from './safte';

interface RawSub {
  key: MetricKey;
  /** Normalized value 0-100, or `null` when the source metric is missing. */
  value: number | null;
}

/** Workout-today contribution: a moderate session helps, an excessive one tires. */
const workoutScore = (metrics: HealthMetrics, fatigueThreshold: number): number => {
  if (!metrics.workoutToday) return 55;
  const minutes = metrics.workoutMinutesToday;
  if (minutes == null) return 70;
  if (minutes <= fatigueThreshold) return 75;
  const overshoot = minutes - fatigueThreshold;
  return clamp(75 - overshoot * 0.4);
};

/** 7-day training load: rewards an optimal band, penalizes overtraining. */
const trainingLoadScore = (load: number, optimal: number, max: number): number => {
  if (load <= optimal) {
    // Ramp from a baseline up to the optimal peak.
    return clamp(60 + (load / optimal) * 40);
  }
  if (max <= optimal) return 100;
  // Decay past the optimal load toward an overtraining floor.
  return clamp(100 - ((load - optimal) / (max - optimal)) * 70);
};

/** Compute the raw (pre-weight) normalized values for every metric. */
const rawSubScores = (metrics: HealthMetrics, config: EnergyConfig): RawSub[] => {
  const { ranges } = config;

  return [
    {
      key: 'sleepHours',
      value: metrics.sleepHours == null ? null : sleepReservoirScore(metrics.sleepHours, ranges),
    },
    {
      key: 'wakeTime',
      value: metrics.wakeTime == null ? null : wakeAlignmentScore(metrics.wakeTime, ranges),
    },
    {
      key: 'timeAwake',
      // "Horário atual": blends continuous time-awake depletion with the
      // circadian alertness at the current moment.
      value: metrics.wakeTime == null ? circadianAlertness(metrics.now) : 0.6 * timeAwakeScore(metrics.wakeTime, metrics.now, ranges) + 0.4 * circadianAlertness(metrics.now),
    },
    {
      key: 'workoutToday',
      value: workoutScore(metrics, ranges.workoutFatigueThresholdMin),
    },
    {
      key: 'hrv',
      value: metrics.hrvMs == null ? null : linear(metrics.hrvMs, ranges.hrvFloor, ranges.hrvCeil),
    },
    {
      key: 'restingHeartRate',
      value: metrics.restingHeartRate == null ? null : linear(metrics.restingHeartRate, ranges.rhrWorst, ranges.rhrBest),
    },
    {
      key: 'deepSleep',
      value: metrics.deepSleepMin == null ? null : linear(metrics.deepSleepMin, 0, ranges.deepIdealMin),
    },
    {
      key: 'remSleep',
      value: metrics.remSleepMin == null ? null : linear(metrics.remSleepMin, 0, ranges.remIdealMin),
    },
    {
      key: 'sleepVariability',
      value: metrics.sleepVariability == null ? null : linear(metrics.sleepVariability, ranges.variabilityWorst, 0),
    },
    {
      key: 'trainingLoad7d',
      value: metrics.trainingLoad7d == null ? null : trainingLoadScore(metrics.trainingLoad7d, ranges.trainingLoadOptimal, ranges.trainingLoadMax),
    },
  ];
};

/** Build the fully-described, weighted sub-scores for the breakdown. */
export const buildSubScores = (metrics: HealthMetrics, config: EnergyConfig): SubScore[] =>
  rawSubScores(metrics, config).map(({ key, value }) => {
    const meta = config.metrics[key];
    return {
      key,
      label: meta.label,
      tier: meta.tier,
      weight: WEIGHT_TIERS[meta.tier],
      available: value != null,
      value: value == null ? 0 : Math.round(value),
    };
  });
