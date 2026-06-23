export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived';
export type GoalTypeKind = 'primary' | 'secondary';
export type ExecutionTrend = 'improving' | 'stable' | 'declining';
export type HealthLevel = 'green' | 'yellow' | 'red';

export type GoalMetric = {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
};

export type GoalHealth = {
  id: string;
  level: HealthLevel;
  label: string;
};

export type Goal = {
  id: string;
  name: string;
  areaId: string;
  type: GoalTypeKind;
  status: GoalStatus;
  rpm: {
    result: string;
    purpose: string;
    impact: string;
  };
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
    type: 'primary',
    status: 'active',
    rpm: { result: '', purpose: '', impact: '' },
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
export function normalizeGoal(raw: Partial<Goal>): Goal {
  const defaults = createEmptyGoal();
  const trend = raw.trend && raw.trend in TREND_LABELS ? raw.trend : defaults.trend;
  const status = raw.status && raw.status in STATUS_LABELS ? raw.status : defaults.status;
  const type = raw.type && raw.type in TYPE_LABELS ? raw.type : defaults.type;

  return {
    ...defaults,
    ...raw,
    id: raw.id ?? defaults.id,
    name: raw.name ?? defaults.name,
    areaId: raw.areaId ?? defaults.areaId,
    type,
    status,
    trend,
    rpm: { ...defaults.rpm, ...raw.rpm },
    metrics: Array.isArray(raw.metrics) ? raw.metrics : defaults.metrics,
    health: Array.isArray(raw.health) ? raw.health : defaults.health,
    progress: raw.progress ?? defaults.progress,
    daysRemaining: raw.daysRemaining ?? defaults.daysRemaining,
    weeksCompleted: raw.weeksCompleted ?? defaults.weeksCompleted,
    totalWeeks: raw.totalWeeks ?? defaults.totalWeeks,
    consistencyScore: raw.consistencyScore ?? defaults.consistencyScore,
    weeklyStreak: raw.weeklyStreak ?? defaults.weeklyStreak,
    confidence: raw.confidence ?? defaults.confidence,
  };
}

export function createEmptyMetric(): GoalMetric {
  return { id: createGoalId(), label: '', current: 0, target: 0, unit: '' };
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
  current: number;
  target: number;
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
    metrics: [{ id: 'projects', label: 'Projetos entregues', current: 0, target: 5 }],
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
      metrics: [{ id: 'workouts', label: 'Treinos por semana', current: 2, target: 4 }],
    },
  ],
};

export const MOCK_GOALS: Goal[] = [
  {
    id: 'goal-bodyfat',
    name: 'Reduzir gordura para 15%',
    areaId: 'health',
    type: 'primary',
    status: 'active',
    rpm: {
      result: 'Reduzir o percentual de gordura corporal de 22% para 15%.',
      purpose: 'Melhorar saúde, energia, confiança e performance atlética.',
      impact: 'Tornar-me mais saudável, forte e disciplinado.',
    },
    progress: 68,
    daysRemaining: 45,
    weeksCompleted: 7,
    totalWeeks: 12,
    metrics: [
      { id: 'bodyfat', label: 'Gordura corporal', current: 17, target: 15, unit: '%' },
      { id: 'weight', label: 'Peso', current: 82, target: 78, unit: 'kg' },
      { id: 'training', label: 'Volume de treino', current: 4, target: 5, unit: 'x/sem' },
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
    type: 'secondary',
    status: 'active',
    rpm: {
      result: 'Lançar o MVP do Flowly e chegar a 100 usuários pagantes.',
      purpose: 'Validar a visão do produto e construir um negócio sustentável.',
      impact: 'Tornar-me o empreendedor descrito na minha visão.',
    },
    progress: 45,
    daysRemaining: 52,
    weeksCompleted: 5,
    totalWeeks: 12,
    metrics: [
      { id: 'customers', label: 'Clientes', current: 38, target: 100, unit: '' },
      { id: 'mrr', label: 'MRR', current: 1200, target: 4000, unit: 'R$' },
      { id: 'releases', label: 'Releases', current: 6, target: 12, unit: '' },
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
    areaId: setup.mainGoal.label,
    type: 'primary',
    status: 'active',
    rpm: { ...setup.mainGoal.rpm },
    totalWeeks,
    daysRemaining,
    metrics: setup.mainGoal.metrics.map((metric) => ({
      id: metric.id,
      label: metric.label,
      current: metric.current,
      target: metric.target,
      unit: '',
    })),
  };

  const secondaries: Goal[] = setup.secondaryGoals.map((goal) => ({
    ...createEmptyGoal(),
    id: createGoalId(),
    name: goal.name,
    areaId: goal.label,
    type: 'secondary',
    status: 'active',
    rpm: { ...goal.rpm },
    totalWeeks,
    daysRemaining,
    metrics: goal.metrics.map((metric) => ({
      id: metric.id,
      label: metric.label,
      current: metric.current,
      target: metric.target,
      unit: '',
    })),
  }));

  return [main, ...secondaries];
}
