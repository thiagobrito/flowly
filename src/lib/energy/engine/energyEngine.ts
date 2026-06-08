import type { EnergyConfig } from '../config';
import { defaultConfig } from '../config';
import type { EnergyBand, EnergyScore, HealthMetrics } from '../types';
import { buildSubScores } from './components';

const resolveBand = (score: number, bands: EnergyConfig['bands']): EnergyBand => {
  if (score >= bands.high) return 'high';
  if (score >= bands.moderate) return 'moderate';
  return 'low';
};

/**
 * Energy Engine: turns normalized {@link HealthMetrics} into an Energy Score
 * (0-100) using a weighted average of the available sub-scores. Missing signals
 * are excluded and the remaining weights are re-normalized automatically.
 */
export const computeEnergyScore = (metrics: HealthMetrics, config: EnergyConfig = defaultConfig): EnergyScore => {
  const breakdown = buildSubScores(metrics, config);
  const available = breakdown.filter((sub) => sub.available);

  const totalWeight = available.reduce((sum, sub) => sum + sub.weight, 0);
  const weighted = available.reduce((sum, sub) => sum + sub.value * sub.weight, 0);

  const score = totalWeight > 0 ? Math.round(weighted / totalWeight) : 0;

  return {
    score,
    band: resolveBand(score, config.bands),
    breakdown,
    computedAt: metrics.now,
  };
};
