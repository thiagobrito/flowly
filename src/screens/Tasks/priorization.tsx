import type { FrequencyConfig, Task } from '../NewTask/data';

/**
 * Task enriquecida com os campos opcionais usados para o alinhamento de meta (O).
 * Hoje a coleção `flowly.tasks` não possui esses campos; quando existirem, o
 * FlowScore passa a conceder o bônus de 50% automaticamente.
 */
export type PrioritizableTask = Task & {
  randomId: string;
  goalAligned?: boolean;
  goalId?: string | null;
};

/** Componentes individuais que alimentam a fórmula do FlowScore. */
export type FlowScoreComponents = {
  /** Impact (0-5). */
  I: number;
  /** Energy Required (0-5). */
  E: number;
  /** Goal Alignment (0 ou 1). */
  O: 0 | 1;
  /** Urgency (0-2). */
  T: 0 | 1 | 2;
  /** Energy Compatibility (0-1). */
  C: number;
};

export type FlowScoreResult = {
  task: PrioritizableTask;
  flowScore: number;
  components: FlowScoreComponents;
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/** Normaliza uma data (string `YYYY-MM-DD` ou Date) para meia-noite local. */
const toLocalMidnight = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Último dia (domingo) da semana atual, à meia-noite. Semana: domingo a sábado. */
const endOfWeek = (now: Date): Date => {
  const start = toLocalMidnight(now);
  const daysUntilSunday = 6 - start.getDay();
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + daysUntilSunday);
};

/**
 * Deriva a urgência (T) a partir da frequência da task e da data atual.
 *
 * Regras (baseadas em data):
 * - `once`: data == hoje ou atrasada -> 2; dentro da semana atual (até domingo) -> 1; senão -> 0.
 * - `daily`: todo dia, ou `days` contendo hoje -> 2.
 * - `weekly`: -> 1.
 * - `interval` / `trigger` / sem data -> 0.
 */
export function computeUrgency(frequency: FrequencyConfig, now: Date = new Date()): 0 | 1 | 2 {
  switch (frequency.kind) {
    case 'once': {
      if (!frequency.date) return 0;
      const [year, month, day] = frequency.date.split('-').map(Number);
      if (!year || !month || !day) return 0;
      const due = new Date(year, month - 1, day);
      const today = toLocalMidnight(now);
      if (due.getTime() <= today.getTime()) return 2;
      if (due.getTime() <= endOfWeek(now).getTime()) return 1;
      return 0;
    }
    case 'daily': {
      if (frequency.everyDay) return 2;
      return frequency.days.includes(now.getDay()) ? 2 : 0;
    }
    case 'weekly':
      return 1;
    case 'interval':
    case 'trigger':
    default:
      return 0;
  }
}

/**
 * Calcula o FlowScore de uma única task.
 *
 * FlowScore = ((I + 1)^2 * (1 + 0.5*O) * (1 + 0.25*T) * C) / (E + 1)
 *
 * @param task Task a ser avaliada.
 * @param currentEnergy Energia atual do usuário na escala 0-5. Caso a origem
 *   seja o `useEnergyScore` (0-100), converta antes com `score / 20`.
 * @param now Data de referência para o cálculo da urgência.
 */
export function computeFlowScore(task: PrioritizableTask, currentEnergy: number, now: Date = new Date()): FlowScoreResult {
  const I = clamp(task.impact ?? 0, 0, 5);
  const E = clamp(task.energy ?? 0, 0, 5);
  const O: 0 | 1 = task.goalAligned || task.goalId ? 1 : 0;
  const T = computeUrgency(task.frequency, now);
  const energy = clamp(currentEnergy, 0, 5);
  const C = clamp(1 - Math.abs(energy - E) / 5, 0, 1);

  const flowScore = ((I + 1) ** 2 * (1 + 0.5 * O) * (1 + 0.25 * T) * C) / (E + 1);

  return { task, flowScore, components: { I, E, O, T, C } };
}

/**
 * Ordena uma lista de tasks pelo FlowScore (maior primeiro). O primeiro item é
 * o mais importante. Empates são resolvidos por urgência e depois por impacto,
 * mantendo a ordenação estável.
 *
 * @param tasks Lista de tasks vinda da coleção `flowly.tasks`.
 * @param currentEnergy Energia atual do usuário (0-5).
 * @param now Data de referência para a urgência.
 */
export function prioritizeTasks(tasks: PrioritizableTask[], currentEnergy: number, now: Date = new Date()): PrioritizableTask[] {
  return tasks
    .map((task) => computeFlowScore(task, currentEnergy, now))
    .sort((a, b) => {
      if (b.flowScore !== a.flowScore) return b.flowScore - a.flowScore;
      if (b.components.T !== a.components.T) return b.components.T - a.components.T;
      return b.components.I - a.components.I;
    })
    .map((result) => result.task);
}
