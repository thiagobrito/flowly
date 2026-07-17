import { resolveLifeAreaId } from '@/screens/common';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived';
export type GoalTypeKind = 'primary' | 'secondary';
export type ExecutionTrend = 'improving' | 'stable' | 'declining';
export type HealthLevel = 'green' | 'yellow' | 'red';
export type MetricDirection = 'increase' | 'decrease';
export type MetricUnitKind = 'number' | 'currency' | 'weight';
export type CurrencyCode = 'BRL' | 'USD' | 'EUR';
export type WeightUnit = 'kg' | 'lb';

export type ResolvedMetricUnit = {
  unitKind: MetricUnitKind;
  currency?: CurrencyCode;
  weightUnit?: WeightUnit;
};

export const UNIT_KIND_OPTIONS = [
  { value: 'number' as const, label: 'Número' },
  { value: 'currency' as const, label: 'Dinheiro' },
  { value: 'weight' as const, label: 'Peso' },
];

export const CURRENCY_OPTIONS = [
  { value: 'BRL' as const, label: 'R$', locale: 'pt-BR' },
  { value: 'USD' as const, label: '$', locale: 'en-US' },
  { value: 'EUR' as const, label: '€', locale: 'de-DE' },
];

export const WEIGHT_OPTIONS = [
  { value: 'kg' as const, label: 'Kg' },
  { value: 'lb' as const, label: 'Lb' },
];

export type GoalMetric = {
  id: string;
  label: string;
  /** Ponto de partida da métrica no ciclo. */
  initial: number;
  current: number;
  target: number;
  /** @deprecated Legacy free-text unit; use unitKind/currency/weightUnit instead. */
  unit: string;
  unitKind?: MetricUnitKind;
  currency?: CurrencyCode;
  weightUnit?: WeightUnit;
  direction?: MetricDirection;
};

export function inferMetricDirection(start: number, target: number): MetricDirection {
  return target < start ? 'decrease' : 'increase';
}

export function nextMetricDirection(prev: Partial<Pick<GoalMetric, 'initial' | 'current' | 'target' | 'direction'>> & Pick<GoalMetric, 'current' | 'target'>, patch: Partial<Pick<GoalMetric, 'initial' | 'current' | 'target'>>): MetricDirection {
  const initial = patch.initial ?? prev.initial ?? prev.current;
  const target = patch.target ?? prev.target;
  if ('target' in patch || 'initial' in patch || !prev.direction) {
    return inferMetricDirection(initial, target);
  }
  return prev.direction;
}

export function resolveMetricDirection(metric: Pick<GoalMetric, 'initial' | 'current' | 'target' | 'direction'>): MetricDirection {
  if (metric.direction === 'increase' || metric.direction === 'decrease') return metric.direction;
  return inferMetricDirection(metric.initial ?? metric.current, metric.target);
}

/** Progresso 0–100 relativo ao ponto de partida (initial → target). */
export function computeMetricProgress(metric: Pick<GoalMetric, 'initial' | 'current' | 'target' | 'direction'>): number {
  const initial = metric.initial ?? metric.current ?? 0;
  const { current, target } = metric;
  const direction = resolveMetricDirection({ ...metric, initial });
  const range = direction === 'decrease' ? initial - target : target - initial;

  if (range === 0) {
    return current === target ? 100 : 0;
  }

  const raw = direction === 'decrease' ? (initial - current) / range : (current - initial) / range;
  return Math.min(100, Math.max(0, Math.round(raw * 100)));
}

function currencyOption(code: CurrencyCode) {
  return CURRENCY_OPTIONS.find((option) => option.value === code) ?? CURRENCY_OPTIONS[0]!;
}

export function resolveMetricUnit(metric: Partial<Pick<GoalMetric, 'unit' | 'unitKind' | 'currency' | 'weightUnit'>>): ResolvedMetricUnit {
  if (metric.unitKind === 'currency') {
    return { unitKind: 'currency', currency: metric.currency ?? 'BRL' };
  }
  if (metric.unitKind === 'weight') {
    return { unitKind: 'weight', weightUnit: metric.weightUnit ?? 'kg' };
  }
  if (metric.unitKind === 'number') {
    return { unitKind: 'number' };
  }

  const legacy = (metric.unit ?? '').trim().toLowerCase();
  if (legacy === 'r$') return { unitKind: 'currency', currency: 'BRL' };
  if (legacy === 'kg') return { unitKind: 'weight', weightUnit: 'kg' };
  if (legacy === 'lb') return { unitKind: 'weight', weightUnit: 'lb' };
  return { unitKind: 'number' };
}

export function formatMetricValue(value: number, unit: ResolvedMetricUnit) {
  if (unit.unitKind === 'currency') {
    const option = currencyOption(unit.currency ?? 'BRL');
    return `${option.label} ${value.toLocaleString(option.locale, { maximumFractionDigits: 2 })}`;
  }
  if (unit.unitKind === 'weight') {
    const weightUnit = unit.weightUnit ?? 'kg';
    return `${value} ${weightUnit}`;
  }
  return `${value}`;
}

function normalizeMetric(raw: Partial<GoalMetric> & Pick<GoalMetric, 'id' | 'label'>): GoalMetric {
  const current = raw.current ?? 0;
  const target = raw.target ?? 0;
  const initial = raw.initial ?? current;
  const resolved = resolveMetricUnit(raw);
  return {
    id: raw.id,
    label: raw.label,
    initial,
    current,
    target,
    unit: raw.unit ?? '',
    unitKind: resolved.unitKind,
    currency: resolved.currency,
    weightUnit: resolved.weightUnit,
    direction: raw.direction ?? inferMetricDirection(initial, target),
  };
}

export type GoalHealth = {
  id: string;
  level: HealthLevel;
  label: string;
};

export type Goal = {
  id: string;
  name: string;
  areaId: string;
  label: string;
  type: GoalTypeKind;
  status: GoalStatus;
  rpm: {
    result: string;
    purpose: string;
    impact: string;
  };
  points: number;
  progress: number;
  daysRemaining: number;
  weeksCompleted: number;
  totalWeeks: number;
  metrics: GoalMetric[];
  consistencyScore: number;
  weeklyStreak: number;
  trend: ExecutionTrend;
  confidence: number;
  health: GoalHealth[];
};

export const STATUS_LABELS: Record<GoalStatus, string> = {
  active: 'Ativa',
  completed: 'Concluída',
  paused: 'Pausada',
  archived: 'Arquivada',
};

export const TYPE_LABELS: Record<GoalTypeKind, string> = {
  primary: 'Meta principal',
  secondary: 'Meta secundária',
};

export const TREND_LABELS: Record<ExecutionTrend, string> = {
  improving: 'Melhorando',
  stable: 'Estável',
  declining: 'Em queda',
};

export const HEALTH_DOT_COLOR: Record<HealthLevel, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
};

export const STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: 'active', label: STATUS_LABELS.active },
  { value: 'paused', label: STATUS_LABELS.paused },
  { value: 'completed', label: STATUS_LABELS.completed },
  { value: 'archived', label: STATUS_LABELS.archived },
];

export const TYPE_OPTIONS: { value: GoalTypeKind; label: string }[] = [
  { value: 'primary', label: TYPE_LABELS.primary },
  { value: 'secondary', label: TYPE_LABELS.secondary },
];

export const TREND_OPTIONS: { value: ExecutionTrend; label: string }[] = [
  { value: 'improving', label: TREND_LABELS.improving },
  { value: 'stable', label: TREND_LABELS.stable },
  { value: 'declining', label: TREND_LABELS.declining },
];

export const HEALTH_LEVEL_CYCLE: HealthLevel[] = ['green', 'yellow', 'red'];

let goalCounter = 0;

export function createGoalId(): string {
  goalCounter += 1;
  return `goal-${Date.now()}-${goalCounter}`;
}

export function createEmptyGoal(): Goal {
  return {
    id: createGoalId(),
    name: '',
    areaId: 'goal',
    label: 'goal',
    type: 'primary',
    status: 'active',
    rpm: { result: '', purpose: '', impact: '' },
    points: 0,
    progress: 0,
    daysRemaining: 84,
    weeksCompleted: 0,
    totalWeeks: 12,
    metrics: [],
    consistencyScore: 0,
    weeklyStreak: 0,
    trend: 'stable',
    confidence: 5,
    health: [],
  };
}

/** Preenche campos calculados ausentes quando a API devolve só o payload da anamnese. */
export function normalizeGoal(raw: Partial<Goal> & { area?: string; label?: string }): Goal {
  const defaults = createEmptyGoal();
  const trend = raw.trend && raw.trend in TREND_LABELS ? raw.trend : defaults.trend;
  const status = raw.status && raw.status in STATUS_LABELS ? raw.status : defaults.status;
  const type = raw.type && raw.type in TYPE_LABELS ? raw.type : defaults.type;
  const areaId = resolveLifeAreaId(raw.areaId ?? raw.area ?? raw.label);

  return {
    ...defaults,
    ...raw,
    id: raw.id ?? defaults.id,
    name: raw.name ?? defaults.name,
    areaId,
    type,
    status,
    trend,
    rpm: { ...defaults.rpm, ...raw.rpm },
    metrics: Array.isArray(raw.metrics) ? raw.metrics.map((metric) => normalizeMetric(metric)) : defaults.metrics,
    health: Array.isArray(raw.health) ? raw.health : defaults.health,
    progress: raw.progress ?? defaults.progress,
    points: raw.points ?? defaults.points,
    daysRemaining: raw.daysRemaining ?? defaults.daysRemaining,
    weeksCompleted: raw.weeksCompleted ?? defaults.weeksCompleted,
    totalWeeks: raw.totalWeeks ?? defaults.totalWeeks,
    consistencyScore: raw.consistencyScore ?? defaults.consistencyScore,
    weeklyStreak: raw.weeklyStreak ?? defaults.weeklyStreak,
    confidence: raw.confidence ?? defaults.confidence,
  };
}

export function createEmptyMetric(): GoalMetric {
  return { id: createGoalId(), label: '', initial: 0, current: 0, target: 0, unit: '', unitKind: 'number', direction: 'increase' };
}

export function createEmptyHealth(): GoalHealth {
  return { id: createGoalId(), level: 'green', label: '' };
}

/**
 * Estrutura preenchida pela anamnese (tela `NewGoals`). Representa apenas o que o
 * usuário responde — os demais campos do `Goal` (progresso, semanas, consistência,
 * tendência, saúde etc.) são calculados automaticamente no backend.
 */
export type GoalSetupMetric = {
  id: string;
  label: string;
  initial: number;
  current: number;
  target: number;
  direction?: MetricDirection;
};

export type SecondaryGoalSetup = {
  label: string;
  name: string;
  rpm: {
    result: string;
    purpose: string;
    impact: string;
  };
  metrics: GoalSetupMetric[];
};

export type GoalSetup = {
  cycle: {
    startDate: string;
    endDate: string;
  };
  mainGoal: {
    label: string;
    name: string;
    rpm: {
      result: string;
      purpose: string;
      impact: string;
    };
    metrics: GoalSetupMetric[];
  };
  secondaryGoals: SecondaryGoalSetup[];
};

/** Resultado de uma anamnese concluída — o backend completa os campos restantes. */
export const MOCK_GOAL_SETUP: GoalSetup = {
  cycle: {
    startDate: '2026-06-22',
    endDate: '2026-09-14',
  },
  mainGoal: {
    label: 'work',
    name: 'Crescer na carreira',
    rpm: {
      result: 'Conseguir promoção até setembro',
      purpose: 'Ter mais impacto e reconhecimento',
      impact: 'Melhorar qualidade de vida da família',
    },
    metrics: [{ id: 'projects', label: 'Projetos entregues', initial: 0, current: 0, target: 5 }],
  },
  secondaryGoals: [
    {
      label: 'health',
      name: 'Saúde',
      rpm: {
        result: 'Treinar 4x por semana e dormir 8 horas por noite',
        purpose: 'Ter mais energia e disposição para a família e o trabalho',
        impact: 'Viver com mais saúde e bem-estar no longo prazo',
      },
      metrics: [{ id: 'workouts', label: 'Treinos por semana', initial: 2, current: 2, target: 4 }],
    },
  ],
};

export const MOCK_GOALS: Goal[] = [
  {
    id: 'goal-bodyfat',
    name: 'Reduzir gordura para 15%',
    areaId: 'health',
    label: 'goal',
    type: 'primary',
    status: 'active',
    rpm: {
      result: 'Reduzir o percentual de gordura corporal de 22% para 15%.',
      purpose: 'Melhorar saúde, energia, confiança e performance atlética.',
      impact: 'Tornar-me mais saudável, forte e disciplinado.',
    },
    progress: 68,
    points: 250,
    daysRemaining: 45,
    weeksCompleted: 7,
    totalWeeks: 12,
    metrics: [
      { id: 'bodyfat', label: 'Gordura corporal', initial: 22, current: 17, target: 15, unit: '%', direction: 'decrease' },
      { id: 'weight', label: 'Peso', initial: 85, current: 82, target: 78, unit: 'kg', direction: 'decrease' },
      { id: 'training', label: 'Volume de treino', initial: 2, current: 4, target: 5, unit: 'x/sem', direction: 'increase' },
    ],
    consistencyScore: 87,
    weeklyStreak: 5,
    trend: 'improving',
    confidence: 8,
    health: [
      { id: 'bf-h1', level: 'green', label: 'Progresso dentro do ritmo' },
      { id: 'bf-h2', level: 'green', label: 'Hábitos consistentes' },
      { id: 'bf-h3', level: 'yellow', label: 'Tempo de foco abaixo da meta' },
    ],
  },
  {
    id: 'goal-flowly',
    name: 'Lançar o MVP do Flowly',
    areaId: 'work',
    label: 'goal',
    type: 'secondary',
    status: 'active',
    rpm: {
      result: 'Lançar o MVP do Flowly e chegar a 100 usuários pagantes.',
      purpose: 'Validar a visão do produto e construir um negócio sustentável.',
      impact: 'Tornar-me o empreendedor descrito na minha visão.',
    },
    progress: 45,
    points: 200,
    daysRemaining: 52,
    weeksCompleted: 5,
    totalWeeks: 12,
    metrics: [
      { id: 'customers', label: 'Clientes', initial: 0, current: 38, target: 100, unit: '' },
      { id: 'mrr', label: 'MRR', initial: 0, current: 1200, target: 4000, unit: 'R$' },
      { id: 'releases', label: 'Releases', initial: 0, current: 6, target: 12, unit: '' },
    ],
    consistencyScore: 72,
    weeklyStreak: 3,
    trend: 'stable',
    confidence: 6,
    health: [
      { id: 'fl-h1', level: 'green', label: 'Releases no ritmo planejado' },
      { id: 'fl-h2', level: 'yellow', label: 'Aquisição de clientes lenta' },
      { id: 'fl-h3', level: 'red', label: 'Compromissos semanais não cumpridos' },
    ],
  },
];

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** Número de semanas entre duas datas ISO (mínimo de 1). */
export function cycleWeeks(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 12;
  return Math.max(1, Math.round((end - start) / MS_PER_WEEK));
}

/** Cria uma anamnese vazia para iniciar o fluxo da tela `NewGoals`. */
export function createEmptyGoalSetup(): GoalSetup {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 12 * 7);
  const toIso = (date: Date) => date.toISOString().slice(0, 10);

  return {
    cycle: { startDate: toIso(start), endDate: toIso(end) },
    mainGoal: { label: '', name: '', rpm: { result: '', purpose: '', impact: '' }, metrics: [] },
    secondaryGoals: [],
  };
}

/**
 * Converte o resultado da anamnese em `Goal[]` para exibição local enquanto o
 * backend não devolve os campos calculados. Mantém apenas o que o usuário
 * informou e usa defaults seguros para o restante.
 */
export function goalSetupToGoals(setup: GoalSetup): Goal[] {
  const totalWeeks = cycleWeeks(setup.cycle.startDate, setup.cycle.endDate);
  const daysRemaining = totalWeeks * 7;

  const main: Goal = {
    ...createEmptyGoal(),
    id: createGoalId(),
    name: setup.mainGoal.name,
    areaId: resolveLifeAreaId(setup.mainGoal.label),
    type: 'primary',
    status: 'active',
    rpm: { ...setup.mainGoal.rpm },
    totalWeeks,
    daysRemaining,
    metrics: setup.mainGoal.metrics.map((metric) => {
      const initial = metric.initial ?? metric.current;
      const current = metric.current ?? initial;
      return {
        id: metric.id,
        label: metric.label,
        initial,
        current,
        target: metric.target,
        unit: '',
        direction: metric.direction ?? inferMetricDirection(initial, metric.target),
      };
    }),
  };

  const secondaries: Goal[] = setup.secondaryGoals.map((goal) => ({
    ...createEmptyGoal(),
    id: createGoalId(),
    name: goal.name,
    areaId: resolveLifeAreaId(goal.label),
    type: 'secondary',
    status: 'active',
    rpm: { ...goal.rpm },
    totalWeeks,
    daysRemaining,
    metrics: goal.metrics.map((metric) => {
      const initial = metric.initial ?? metric.current;
      const current = metric.current ?? initial;
      return {
        id: metric.id,
        label: metric.label,
        initial,
        current,
        target: metric.target,
        unit: '',
        direction: metric.direction ?? inferMetricDirection(initial, metric.target),
      };
    }),
  }));

  return [main, ...secondaries];
}

/** Converte uma meta secundária da anamnese em `Goal`, herdando ciclo da meta principal. */
export function secondarySetupToGoal(secondary: SecondaryGoalSetup, context: Pick<Goal, 'totalWeeks' | 'daysRemaining'>): Goal {
  return {
    ...createEmptyGoal(),
    id: createGoalId(),
    name: secondary.name,
    areaId: resolveLifeAreaId(secondary.label),
    type: 'secondary',
    status: 'active',
    rpm: { ...secondary.rpm },
    totalWeeks: context.totalWeeks,
    daysRemaining: context.daysRemaining,
    metrics: secondary.metrics.map((metric) => {
      const initial = metric.initial ?? metric.current;
      const current = metric.current ?? initial;
      return {
        id: metric.id,
        label: metric.label,
        initial,
        current,
        target: metric.target,
        unit: '',
        direction: metric.direction ?? inferMetricDirection(initial, metric.target),
      };
    }),
  };
}
