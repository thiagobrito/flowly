/**
 * Modos manuais de energia do dia.
 *
 * - `ideal` — usa o score do motor (sem override)
 * - `low` — ~30% de capacidade ("Tô com 30%")
 * - `rushed` — só o essencial: alto impacto e duração curta
 */

export type EnergyMode = 'ideal' | 'low' | 'rushed';

export type EnergyModeState = {
  /** Dia civil (YYYY-MM-DD) no fuso do app ao qual o modo se aplica. */
  dateKey: string;
  mode: EnergyMode;
};

/** Score 0–100 que o modo declara. `null` = manter o valor do motor. */
export const MODE_DECLARED_SCORE: Record<EnergyMode, number | null> = {
  ideal: null,
  low: 30,
  rushed: null,
};

/** Rushed: só tarefas com impacto alto e duração curta (ou sem estimativa). */
export const RUSHED_MIN_IMPACT = 4;
export const RUSHED_MAX_MINUTES = 45;

export const ENERGY_MODE_OPTIONS: Array<{
  mode: EnergyMode;
  label: string;
  description: string;
}> = [
  {
    mode: 'ideal',
    label: 'Ideal',
    description: 'O Flowly usa sua energia real do momento',
  },
  {
    mode: 'low',
    label: 'Tô com 30%',
    description: 'Só o essencial, tarefas leves e cabíveis',
  },
  {
    mode: 'rushed',
    label: 'Rushed',
    description: 'Alto impacto e pouca duração — o que cabe agora',
  },
];
