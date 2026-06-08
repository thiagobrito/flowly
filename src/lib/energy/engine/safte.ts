import type { NormalizationRanges } from '../config';
import { clamp, hourOfDay, hoursBetween, triangular } from './normalize';

/**
 * SAFTE-inspired primitives.
 *
 * The SAFTE (Sleep, Activity, Fatigue, and Task Effectiveness) model combines:
 *  - a sleep "reservoir" that fills during sleep and depletes while awake, and
 *  - a circadian process (process C) that modulates alertness over the day.
 *
 * We implement lightweight, transparent approximations of these processes that
 * feed the sleep / wake / current-time sub-scores of the Energy Score.
 */

/**
 * Reservoir replenishment from the last sleep session.
 * Full reservoir at `idealSleepHours`; mild penalty for large oversleep.
 */
export const sleepReservoirScore = (sleepHours: number, ranges: NormalizationRanges): number => {
  const { idealSleepHours } = ranges;
  if (sleepHours <= idealSleepHours) {
    return clamp((sleepHours / idealSleepHours) * 100);
  }
  // Oversleeping past the ideal slightly reduces perceived energy.
  const overshoot = sleepHours - idealSleepHours;
  return clamp(100 - overshoot * 8);
};

/**
 * Circadian process C: alertness oscillation across the day.
 * Modeled as a main 24h cosine plus a 12h harmonic, peaking in the late
 * afternoon (~16:00) and troughing in the early morning (~04:00).
 * Returns a 0-100 alertness value.
 */
export const circadianAlertness = (nowIso: string): number => {
  const hour = hourOfDay(nowIso);
  const acrophase = 16; // peak alertness hour
  const main = Math.cos((2 * Math.PI * (hour - acrophase)) / 24);
  const harmonic = 0.5 * Math.cos((4 * Math.PI * (hour - acrophase)) / 24);
  const raw = main + harmonic; // approx range [-1.5, 1.5]
  return clamp(((raw + 1.5) / 3) * 100);
};

/**
 * Reservoir depletion driven by continuous time awake.
 * Full energy right after waking, decaying to ~0 by `maxAwakeHours`.
 */
export const timeAwakeScore = (wakeTimeIso: string, nowIso: string, ranges: NormalizationRanges): number => {
  const awake = Math.max(0, hoursBetween(wakeTimeIso, nowIso));
  return clamp(100 - (awake / ranges.maxAwakeHours) * 100);
};

/**
 * How well the wake-up time aligns with the user's ideal circadian wake hour.
 * Rewards consistent, well-timed awakenings.
 */
export const wakeAlignmentScore = (wakeTimeIso: string, ranges: NormalizationRanges): number => {
  const wakeHour = hourOfDay(wakeTimeIso);
  return triangular(wakeHour, ranges.idealWakeHour, ranges.wakeToleranceHours);
};
