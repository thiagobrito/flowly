import { energyScoreToLevel } from '@/lib/energy/engine/compatibility';

import { type EnergyMode, MODE_DECLARED_SCORE, RUSHED_MAX_MINUTES, RUSHED_MIN_IMPACT } from './types';

/** Par (score, nível) que o motor publicou — `doubleEnergyScore` / `doubleEnergyLevel`. */
export type EngineEnergy = {
  score: number;
  level: number;
};

export type EffectiveEnergy = {
  /** Score 0–100 efetivo (exibido / usado no override). */
  score: number;
  /** Nível enviado à priorização (mesmo padrão double do engine). */
  level: number;
  /** Score declarado pelo modo; `null` quando o modo não declara um valor. */
  declaredScore: number | null;
};

/**
 * Converte um score declarado (0–100, mesma escala do `doubleEnergyScore`) no
 * nível usado na priorização.
 *
 * O motor deriva `doubleEnergyLevel` do `energyScore` cru (0–50), não do
 * dobrado — daí o `/ 2`. Só serve para scores *declarados* por um modo: para o
 * valor do próprio motor, use o `level` que ele já publicou, porque
 * `doubleEnergyScore` sofre clamp em 100 e converter de volta perde a faixa
 * acima de 5.
 */
export function scoreToApiLevel(declaredScore: number): number {
  return energyScoreToLevel(declaredScore / 2) * 2;
}

/**
 * Aplica o modo sobre o resultado do motor sem alterar o cálculo do engine.
 * No modo `ideal` (e em `rushed`, que age só por filtro) o par do motor passa
 * intacto.
 */
export function applyEnergyMode(mode: EnergyMode, engine: EngineEnergy): EffectiveEnergy {
  const declared = MODE_DECLARED_SCORE[mode];
  if (declared == null) {
    return { score: engine.score, level: engine.level, declaredScore: null };
  }

  return { score: declared, level: scoreToApiLevel(declared), declaredScore: declared };
}

type FilterableTask = {
  impact?: number | null;
  estimatedMinutes?: number | null;
};

/** Em Rushed, mantém só alto impacto e duração curta (ou sem estimativa). */
export function filterTasksForMode<T extends FilterableTask>(tasks: T[], mode: EnergyMode): T[] {
  if (mode !== 'rushed') return tasks;

  return tasks.filter((task) => {
    const impact = task.impact ?? 0;
    if (impact < RUSHED_MIN_IMPACT) return false;

    const minutes = task.estimatedMinutes;
    if (minutes == null || minutes <= 0) return true;
    return minutes <= RUSHED_MAX_MINUTES;
  });
}
