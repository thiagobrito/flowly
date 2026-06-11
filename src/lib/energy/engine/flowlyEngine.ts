import type { EnergyBand, EnergyCurvePoint, FlowlyEnergyResult, FlowlyEngineInput, HealthMetrics } from '../types';
import { computeCircadianEnergy, computeSleepInertiaPenalty } from './circadian';
import { energyScoreToLevel } from './compatibility';
import type { FlowlyEngineConfig } from './flowlyConfig';
import { defaultFlowlyConfig } from './flowlyConfig';
import { clamp, hourOfDay, hoursBetween } from './normalize';
import { computeRecoveryScore } from './recovery';
import { computeSleepDebtHours, computeSleepDebtScore } from './sleepDebt';

/**
 * Flowly Energy Engine — orchestrator.
 *
 * Final formula:
 *
 *   energy(t) = clamp( circadian(t) * recovery / 100 - inertiaPenalty(t), 0, 100 )
 *
 * - `recovery` is moment-independent (it reflects last night + the rolling
 *   sleep-debt window), so it acts as a multiplicative ceiling on the day:
 *   a poorly recovered user never reaches the top of their circadian curve.
 * - `circadian(t)` shapes the day with the morning peak, afternoon dip,
 *   second peak and evening decline.
 * - `inertiaPenalty(t)` is subtractive and only active in the first 90 min.
 */

const resolveBand = (score: number, bands: FlowlyEngineConfig['bands']): EnergyBand => {
  if (score >= bands.high) return 'high';
  if (score >= bands.moderate) return 'moderate';
  return 'low';
};

/** Wake -> bedtime span, falling back to `24 - sleepNeed` when unknown. */
const resolveDayLengthHours = (input: FlowlyEngineInput, sleepNeedHours: number, config: FlowlyEngineConfig): number => {
  const { minDayLengthHours, maxDayLengthHours } = config.circadian;
  if (input.wakeTime && input.bedTime) {
    const span = hoursBetween(input.wakeTime, input.bedTime);
    // Only meaningful when bedTime refers to tonight (i.e. after the wake-up).
    if (span >= minDayLengthHours && span <= maxDayLengthHours) return span;
  }
  return clamp(24 - sleepNeedHours, minDayLengthHours, maxDayLengthHours);
};

/** Hours awake at `momentIso`, estimated from the fallback wake hour if needed. */
const hoursAwakeAt = (momentIso: string, wakeTime: string | null, config: FlowlyEngineConfig): number => {
  if (wakeTime) return Math.max(0, hoursBetween(wakeTime, momentIso));
  return Math.max(0, hourOfDay(momentIso) - config.circadian.fallbackWakeHour);
};

/** Moment-independent context shared by every sample of the day. */
interface DayContext {
  sleepNeedHours: number;
  sleepDebtHours: number;
  sleepDebtScore: number;
  recoveryScore: number;
  dayLengthHours: number;
}

const buildDayContext = (input: FlowlyEngineInput, config: FlowlyEngineConfig): DayContext => {
  const sleepNeedHours = input.sleepNeedHours ?? config.defaultSleepNeedHours;
  const hasHistory = input.sleepHistory.length > 0;

  const sleepDebtHours = computeSleepDebtHours(input.sleepHistory, sleepNeedHours, config.sleepDebt.windowDays);
  const sleepDebtScore = computeSleepDebtScore(sleepDebtHours, config.sleepDebt.maxDebtHours);

  const recoveryScore = computeRecoveryScore(
    {
      lastNightSleepHours: input.lastNightSleepHours,
      // With no history we cannot claim "zero debt"; exclude it instead.
      sleepDebtScore: hasHistory ? sleepDebtScore : null,
      hrvMs: input.hrvMs,
      restingHeartRate: input.restingHeartRate,
    },
    sleepNeedHours,
    config,
  );

  return {
    sleepNeedHours,
    sleepDebtHours,
    sleepDebtScore,
    recoveryScore,
    dayLengthHours: resolveDayLengthHours(input, sleepNeedHours, config),
  };
};

const energyFromContext = (context: DayContext, hoursAwake: number, momentIso: string, config: FlowlyEngineConfig): FlowlyEnergyResult => {
  const circadianEnergy = computeCircadianEnergy(hoursAwake, context.dayLengthHours, config);
  const sleepInertiaPenalty = computeSleepInertiaPenalty(hoursAwake, config);
  const energyScore = Math.round(clamp(circadianEnergy * (context.recoveryScore / 100) - sleepInertiaPenalty));

  return {
    energyScore,
    doubleEnergyScore: Math.min(energyScore * 2, 100),
    energyLevel: energyScoreToLevel(energyScore),
    doubleEnergyLevel: Math.min(energyScoreToLevel(energyScore) * 2, 100),
    band: resolveBand(energyScore, config.bands),
    components: {
      sleepNeedHours: context.sleepNeedHours,
      sleepDebtHours: Math.round(context.sleepDebtHours * 100) / 100,
      sleepDebtScore: Math.round(context.sleepDebtScore),
      circadianEnergy: Math.round(circadianEnergy),
      sleepInertiaPenalty: Math.round(sleepInertiaPenalty),
      recoveryScore: Math.round(context.recoveryScore),
      hoursAwake: Math.round(hoursAwake * 100) / 100,
    },
    computedAt: momentIso,
  };
};

/**
 * Computes the Flowly energy score for an arbitrary moment of the day.
 * This is the primitive that powers both "energy now" and the daily curve.
 */
export const computeEnergyAtMoment = (input: FlowlyEngineInput, momentIso: string, config: FlowlyEngineConfig = defaultFlowlyConfig): FlowlyEnergyResult => {
  const context = buildDayContext(input, config);
  return energyFromContext(context, hoursAwakeAt(momentIso, input.wakeTime, config), momentIso, config);
};

/** Convenience wrapper: energy score for "right now". */
export const computeFlowlyEnergy = (input: FlowlyEngineInput, config: FlowlyEngineConfig = defaultFlowlyConfig): FlowlyEnergyResult => computeEnergyAtMoment(input, new Date().toISOString(), config);

export interface EnergyCurveOptions {
  /** Sampling interval in minutes. Defaults to 30. */
  stepMinutes?: number;
}

/**
 * Predicted energy curve from wake-up to bedtime, sampled every
 * `stepMinutes`. Useful for plotting the day and finding the best windows
 * for demanding tasks.
 */
export const generateEnergyCurve = (input: FlowlyEngineInput, config: FlowlyEngineConfig = defaultFlowlyConfig, options: EnergyCurveOptions = {}): EnergyCurvePoint[] => {
  const stepMinutes = options.stepMinutes ?? 30;
  const context = buildDayContext(input, config);

  const start = input.wakeTime
    ? new Date(input.wakeTime)
    : (() => {
        const today = new Date();
        today.setHours(config.circadian.fallbackWakeHour, 0, 0, 0);
        return today;
      })();

  const points: EnergyCurvePoint[] = [];
  const totalMinutes = context.dayLengthHours * 60;
  for (let minutes = 0; minutes <= totalMinutes; minutes += stepMinutes) {
    const time = new Date(start.getTime() + minutes * 60000).toISOString();
    const hoursAwake = minutes / 60;
    points.push({
      time,
      hoursAwake,
      energyScore: energyFromContext(context, hoursAwake, time, config).energyScore,
    });
  }
  return points;
};

/** Adapts the collector output ({@link HealthMetrics}) to the engine input. */
export const flowlyInputFromMetrics = (metrics: HealthMetrics, sleepNeedHours?: number): FlowlyEngineInput => ({
  sleepNeedHours,
  sleepHistory: metrics.sleepHistory ?? [],
  lastNightSleepHours: metrics.sleepHours,
  wakeTime: metrics.wakeTime,
  bedTime: metrics.bedTime,
  hrvMs: metrics.hrvMs,
  restingHeartRate: metrics.restingHeartRate,
});
