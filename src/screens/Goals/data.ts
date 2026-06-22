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

export function createEmptyMetric(): GoalMetric {
  return { id: createGoalId(), label: '', current: 0, target: 0, unit: '' };
}

export function createEmptyHealth(): GoalHealth {
  return { id: createGoalId(), level: 'green', label: '' };
}

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
