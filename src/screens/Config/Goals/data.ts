export type Goal = {
  id: string;
  name: string;
  progress: number;
  currentValue?: string;
  targetValue?: string;
};

export type HistoryCycle = {
  id: string;
  cycle: number;
  goal: string;
  status: 'completed' | 'archived';
};

export type GoalsData = {
  vision: string;
  cycle: {
    currentWeek: number;
    totalWeeks: number;
  };
  mainGoal: Goal;
  secondaryGoals: Goal[];
  history: HistoryCycle[];
};

export const CHANGE_REASONS = ['Meta concluída', 'Meta não é mais relevante', 'Prioridades mudaram', 'Meta era irrealista', 'Outro'] as const;

export const CHANGE_ACTIONS = ['Substituir meta', 'Arquivar meta', 'Adicionar meta secundária', 'Iniciar um novo ciclo'] as const;

// TODO: substituir por dados da API quando o backend estiver disponível
export const MOCK_GOALS_DATA: GoalsData = {
  vision: 'Perder 15kg, lançar o Flowly e melhorar minhas finanças.',

  cycle: {
    currentWeek: 4,
    totalWeeks: 12,
  },
  mainGoal: {
    id: 'main-1',
    name: 'Perder 8kg',
    progress: 37,
    currentValue: '92kg',
    targetValue: '84kg',
  },
  secondaryGoals: [
    { id: 'sec-1', name: 'Lançar MVP do Flowly', progress: 24 },
    { id: 'sec-2', name: 'Ler 2 Livros', progress: 50 },
  ],
  history: [
    { id: 'h-1', cycle: 1, goal: 'Construir MVP', status: 'completed' },
    { id: 'h-2', cycle: 2, goal: 'Perder 5kg', status: 'completed' },
  ],
};
