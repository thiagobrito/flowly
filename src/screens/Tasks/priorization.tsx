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
  /** Urgency (0-2, contínuo — tarefas pontuais sobem conforme o horário se aproxima). */
  T: number;
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
 * - `once`: data == hoje ou atrasada -> 2; nas últimas 24h antes do
 *   compromisso a urgência sobe continuamente de 1 até 2 conforme o horário
 *   se aproxima; dentro da semana atual (até o fim da semana) -> 1; senão -> 0.
 * - `daily`: todo dia, ou `days` contendo hoje -> 2.
 * - `weekly`: -> 1.
 * - `interval` / `trigger` / sem data -> 0.
 */
export function computeUrgency(frequency: FrequencyConfig, now: Date = new Date()): number {
  switch (frequency.kind) {
    case 'once': {
      if (!frequency.date) return 0;
      const [year, month, day] = frequency.date.split('-').map(Number);
      if (!year || !month || !day) return 0;
      const due = new Date(year, month - 1, day);
      const today = toLocalMidnight(now);
      if (due.getTime() <= today.getTime()) return 2;

      // Rampa de proximidade: nas últimas 24h antes do horário marcado
      // (ou da meia-noite do dia, sem horário), T cresce de 1 até 2.
      const [hourStr, minuteStr] = (frequency.time ?? '').split(':');
      const dueMoment = new Date(year, month - 1, day, Number(hourStr) || 0, Number(minuteStr) || 0);
      const hoursUntil = (dueMoment.getTime() - now.getTime()) / 3_600_000;
      if (hoursUntil <= 24) return clamp(1 + (24 - hoursUntil) / 24, 1, 2);

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
 * @param energyLevel Energia atual do usuário na escala 0-5. Caso a origem
 *   seja o `useEnergyScore` (0-100), converta antes com `score / 20`.
 * @param now Data de referência para o cálculo da urgência.
 */
export function computeFlowScore(task: PrioritizableTask, energyLevel: number, now: Date = new Date()): FlowScoreResult {
  const I = clamp(task.impact ?? 0, 0, 5);
  const E = clamp(task.energy ?? 0, 0, 5);
  const O: 0 | 1 = task.goalAligned || task.goalId ? 1 : 0;
  const T = computeUrgency(task.frequency, now);
  // Compatibilidade assimétrica:
  // - Déficit (tarefa exige mais que a energia atual): decaimento exponencial.
  //   A tarefa perde força rapidamente quando está fora da faixa de energia,
  //   mas C nunca chega a 0 — assim o impacto continua ordenando as tarefas
  //   fora da faixa (a de maior impacto/menor custo vem primeiro entre elas),
  //   sem nunca ultrapassar uma tarefa mais próxima da energia disponível.
  // - Sobra (energia maior que a exigida): penalidade linear suave, preferindo
  //   tarefas que aproveitam melhor a energia disponível.
  const gap = E - energyLevel;
  const C = gap > 0 ? Math.exp(-gap) : clamp(1 + gap / 5, 0, 1);

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
export function prioritizeTasks(tasks: PrioritizableTask[], energyLevel: number, now: Date = new Date()): PrioritizableTask[] {
  return tasks
    .map((task) => computeFlowScore(task, energyLevel, now))
    .sort((a, b) => {
      if (b.flowScore !== a.flowScore) return b.flowScore - a.flowScore;
      if (b.components.T !== a.components.T) return b.components.T - a.components.T;
      // Em empates (ex.: exaustão total, tudo com score 0), prefere a tarefa
      // mais leve — "fazer o que dá" — antes de olhar o impacto.
      if (a.components.E !== b.components.E) return a.components.E - b.components.E;
      return b.components.I - a.components.I;
    })
    .map((result) => result.task);
}
