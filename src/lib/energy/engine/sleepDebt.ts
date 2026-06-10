import type { SleepNight } from '../types';
import { defaultFlowlyConfig } from './flowlyConfig';
import { clamp } from './normalize';

/**
 * Sleep Debt — rolling-window accumulation of daily sleep deficits.
 *
 * Math:
 *   dailyDeficit(d) = max(0, sleepNeed - actualSleep(d))
 *   sleepDebt       = Σ dailyDeficit over the most recent `windowDays` nights
 *
 * Deficits only accumulate — a long night does not "erase" a previous short
 * one (consistent with sleep-debt research: recovery happens slowly and is
 * captured by the night simply not adding new deficit).
 */
export const computeSleepDebtHours = (history: SleepNight[], sleepNeedHours: number, windowDays: number = defaultFlowlyConfig.sleepDebt.windowDays): number => {
  const window = [...history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, windowDays);
  return window.reduce((debt, night) => debt + Math.max(0, sleepNeedHours - night.sleepHours), 0);
};

/**
 * Maps sleep debt (hours) onto a 0-100 score.
 *
 * The spec anchors (0h→100, 5h→75, 10h→50, 15h→25, 20h→0) are collinear, so
 * the smooth interpolation reduces to a clamped linear map:
 *
 *   score = 100 * (1 - debt / maxDebtHours)
 *
 * The function is continuous and monotonically decreasing; everything past
 * `maxDebtHours` saturates at 0.
 */
export const computeSleepDebtScore = (sleepDebtHours: number, maxDebtHours: number = defaultFlowlyConfig.sleepDebt.maxDebtHours): number => {
  if (maxDebtHours <= 0) return sleepDebtHours > 0 ? 0 : 100;
  return clamp(100 * (1 - sleepDebtHours / maxDebtHours));
};
