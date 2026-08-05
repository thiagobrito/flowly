/**
 * Regras do coach mobile — determinísticas, sem LLM.
 * Port das regras acionáveis de `web/src/lib/coach/rules.ts` + regra de
 * dívida de sono (deep work → amanhã quando dormiu < 6h).
 *
 * ## Determinismo
 *
 * As sugestões aparecem numa lista curta que o usuário relê várias vezes por
 * dia. Se a ordem muda entre renders, a feature parece aleatória mesmo quando
 * cada sugestão isolada faz sentido. Duas fontes de instabilidade são tratadas
 * aqui:
 *
 * 1. `input.tasks` chega na ordem do servidor, que é a ordem do FlowScore e
 *    muda a cada mudança de nível de energia. Toda regra ordena as candidatas
 *    por critério próprio antes de percorrer.
 * 2. O corte em `MAX_RECOMMENDATIONS` era aplicado sobre a concatenação, então
 *    quem entrava dependia de quantas sugestões cada regra gerou. Agora cada
 *    sugestão declara uma `weight`, e o corte é por relevância.
 *
 * `input.now` é quantizado por quem chama (ver `quantizeNow`), então o
 * `earliestMinute` não anda de segundo em segundo.
 */

import { localDateKey, toLocalISOString } from '@/lib/date';
import type { Task } from '@/screens/NewTask/data';

import type { DayEnergyCurve } from './dayCurve';
import { blockDurationMinutes, blockForDay, type BusyInterval, busyIntervals, energyOfInterval, findBestSlot, formatHourLabel, type Interval, minutesOfIso, SLOT_MINUTES } from './schedule';
import type { CoachInput, CoachInsight } from './types';

const HIGH_IMPACT = 4;
const HIGH_ENERGY_COST = 4;
const MIN_ENERGY_GAIN = 10;

/** Quantas sugestões a tela mostra. */
export const MAX_RECOMMENDATIONS = 3;

/** Abaixo disto, a regra de dívida de sono entra em ação. */
export const LOW_SLEEP_HOURS = 6;

const scoreToLevel = (score: number) => score / 20;

/**
 * Peso base por regra, usado no corte final.
 *
 * Dívida de sono vem primeiro porque é a única que fala de saúde, não de
 * otimização: ignorá-la custa mais que perder uma janela boa.
 */
const RULE_WEIGHT = {
  sleepDebt: 300,
  valley: 200,
  unscheduled: 100,
} as const;

/**
 * Arredonda `now` para baixo no slot de 15 min.
 *
 * Sem isso, `earliestMinute` muda a cada segundo e a mesma sugestão reaparece
 * com um horário ligeiramente diferente em cada render.
 */
export function quantizeNow(now: Date): Date {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const quantized = Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES;

  const result = new Date(now);
  result.setHours(Math.floor(quantized / 60), quantized % 60, 0, 0);
  return result;
}

/** Ordem estável por impacto, depois energia exigida, depois id. */
function byRelevance(a: Task, b: Task): number {
  return (b.impact ?? 0) - (a.impact ?? 0) || (b.energy ?? 0) - (a.energy ?? 0) || a.id.localeCompare(b.id);
}

class SlotPlanner {
  private busy: BusyInterval[];

  private readonly earliestMinute: number;

  constructor(
    private readonly curve: DayEnergyCurve,
    private readonly dateKey: string,
    allTasks: Task[],
    now: Date,
  ) {
    this.busy = busyIntervals(allTasks, dateKey);
    const isToday = localDateKey(now) === dateKey;
    this.earliestMinute = isToday ? (minutesOfIso(toLocalISOString(now)) ?? 0) : 0;
  }

  reserve(task: Task, options: { excludeTaskId?: string } = {}) {
    const durationMin = blockDurationMinutes(task);
    const busy = options.excludeTaskId ? this.busy.filter((interval) => interval.taskId !== options.excludeTaskId) : this.busy;

    const slot = findBestSlot({
      curve: this.curve,
      dateKey: this.dateKey,
      durationMin,
      busy,
      earliestMinute: this.earliestMinute,
    });
    if (!slot) return null;

    this.busy = [...busy, { taskId: task.id, start: slot.startMinute, end: slot.startMinute + durationMin }].sort((a, b) => a.start - b.start);

    return { ...slot, durationMin };
  }
}

/** Insight + peso, usado apenas internamente para ordenar o corte final. */
type WeightedInsight = CoachInsight & { weight: number };

/** Atividades de alto impacto sem horário no dia. */
export function unscheduledImpactRecommendations(input: CoachInput, planner: SlotPlanner): WeightedInsight[] {
  const insights: WeightedInsight[] = [];
  const candidates = input.tasks.filter((task) => (task.impact ?? 0) >= HIGH_IMPACT && !blockForDay(task, input.dateKey)).sort(byRelevance);

  for (const task of candidates) {
    const slot = planner.reserve(task);
    if (slot) {
      insights.push({
        id: `unscheduled-${task.id}`,
        title: `Reserve ${formatHourLabel(slot.startMinute)} para "${task.name}"`,
        detail: input.curve.hasProfile ? `Impacto ${task.impact}/5 e ainda sem horário. Essa é a janela livre com mais energia.` : `Impacto ${task.impact}/5 e ainda sem horário. Esse é o primeiro espaço livre.`,
        actionLabel: 'Aplicar',
        // Impacto maior sobe dentro da regra, sem nunca passar a regra de cima.
        weight: RULE_WEIGHT.unscheduled + (task.impact ?? 0),
        action: {
          type: 'schedule',
          taskId: task.id,
          startISO: slot.startISO,
          durationMin: slot.durationMin,
        },
      });
    }
  }

  return insights;
}

/** Blocos exigentes alocados num vale de energia. */
export function energyValleyRecommendations(input: CoachInput, planner: SlotPlanner): WeightedInsight[] {
  if (!input.curve.hasProfile) return [];

  const insights: WeightedInsight[] = [];

  for (const task of [...input.tasks].sort(byRelevance)) {
    const taskEnergy = task.energy ?? 0;
    if (taskEnergy >= HIGH_ENERGY_COST) {
      const block = blockForDay(task, input.dateKey);
      if (block) {
        const start = minutesOfIso(block.dateTime);
        if (start != null) {
          const current: Interval = { start, end: start + Math.max(block.duration, SLOT_MINUTES) };
          const currentEnergy = energyOfInterval(input.curve, current);
          if (scoreToLevel(currentEnergy) < taskEnergy - 1) {
            const slot = planner.reserve(task, { excludeTaskId: task.id });
            if (slot) {
              const gain =
                energyOfInterval(input.curve, {
                  start: slot.startMinute,
                  end: slot.startMinute + slot.durationMin,
                }) - currentEnergy;
              if (gain >= MIN_ENERGY_GAIN) {
                insights.push({
                  id: `valley-${task.id}`,
                  title: `Mova "${task.name}" para ${formatHourLabel(slot.startMinute)}`,
                  detail: `A atividade pede energia ${taskEnergy}/5, mas o bloco das ${formatHourLabel(start)} cai num vale do seu dia.`,
                  actionLabel: 'Aplicar',
                  weight: RULE_WEIGHT.valley + Math.min(Math.round(gain), 99),
                  action: {
                    type: 'schedule',
                    taskId: task.id,
                    startISO: slot.startISO,
                    durationMin: slot.durationMin,
                  },
                });
              }
            }
          }
        }
      }
    }
  }

  return insights;
}

/**
 * Dormiu < 6h: sugere remarcar deep work (alta energia) para amanhã no pico.
 * Sempre com "Aplicar" — nunca reagendamento silencioso.
 *
 * O horário passa pelo planner de amanhã: sugerir um slot já ocupado é o tipo
 * de sugestão que destrói a confiança na feature inteira.
 */
export function sleepDebtDeferRecommendations(input: CoachInput): WeightedInsight[] {
  if (input.lastNightSleepHours == null || input.lastNightSleepHours >= LOW_SLEEP_HOURS) return [];

  const tomorrow = new Date(input.now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = localDateKey(tomorrow);

  const deepWork = [...input.tasks].filter((task) => (task.energy ?? 0) >= HIGH_ENERGY_COST && Boolean(blockForDay(task, input.dateKey))).sort(byRelevance);

  const target = deepWork[0];
  if (!target) return [];

  // Sem curva de amanhã, reusa a de hoje: o hábito de sono é o mesmo, e o que
  // importa aqui é não colidir com a agenda já marcada para amanhã.
  const tomorrowCurve = input.tomorrowCurve ?? { ...input.curve, dateKey: tomorrowKey };
  const planner = new SlotPlanner(tomorrowCurve, tomorrowKey, input.tomorrowTasks ?? [], input.now);
  const slot = planner.reserve(target);

  // Amanhã sem espaço para o bloco: melhor não sugerir que sugerir errado.
  if (!slot) return [];

  return [
    {
      id: `defer-${target.id}`,
      title: `Deixe "${target.name}" para amanhã às ${formatHourLabel(slot.startMinute)}`,
      detail: `Você dormiu ${input.lastNightSleepHours.toFixed(1)}h. Deep work rende mais com recuperação — o Flowly sugere remarcar.`,
      actionLabel: 'Aplicar',
      weight: RULE_WEIGHT.sleepDebt,
      action: {
        type: 'schedule',
        taskId: target.id,
        startISO: slot.startISO,
        durationMin: slot.durationMin,
      },
    },
  ];
}

/**
 * Todas as sugestões válidas do dia, da mais relevante para a menos.
 *
 * É a lista completa de candidatas: `buildRecommendations` corta em três para a
 * tela, e a camada de IA (`aiSuggestions`) recebe a lista inteira para poder
 * escolher — sem candidatas de sobra, não haveria nada para escolher.
 */
export function buildCandidates(input: CoachInput): CoachInsight[] {
  const planner = new SlotPlanner(input.curve, input.dateKey, [...input.tasks, ...input.concluded], input.now);

  const all = [...sleepDebtDeferRecommendations(input), ...energyValleyRecommendations(input, planner), ...unscheduledImpactRecommendations(input, planner)];

  // Ordena por peso e desempata pelo id, para que dois insights de mesmo peso
  // nunca troquem de lugar entre renders.
  return all.sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id)).map(({ weight: _weight, ...insight }) => insight);
}

export function buildRecommendations(input: CoachInput): CoachInsight[] {
  return buildCandidates(input).slice(0, MAX_RECOMMENDATIONS);
}

export { SlotPlanner };
