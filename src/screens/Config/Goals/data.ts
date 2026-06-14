import { api } from '@/lib/network';

import { addWeeks, toIsoDate } from './dateUtils';

export type Goal = {
  id: string;
  name: string;
  label: string;
  points: number;
  description: string;
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
    startDate: string;
    endDate: string;
  };
  mainGoal: Goal;
  secondaryGoals: Goal[];
  history: HistoryCycle[];
};

export type GoalsApiData = Pick<GoalsData, 'vision' | 'cycle' | 'mainGoal' | 'secondaryGoals'>;

export const CYCLE_WEEKS = 12;

export const CHANGE_REASONS = [
  { id: 'concluded', label: 'Meta concluída' },
  { id: 'irrelevant', label: 'Meta não é mais relevante' },
  { id: 'changed', label: 'Prioridades mudaram' },
  { id: 'not-real', label: 'Meta era irrealista' },
  { id: 'other', label: 'Outro' },
] as const;

export const CHANGE_ACTIONS = [
  { id: 'replace', label: 'Substituir meta' },
  { id: 'archive', label: 'Arquivar meta' },
  { id: 'add-secondary', label: 'Adicionar meta secundária' },
  { id: 'new-cycle', label: 'Iniciar um novo ciclo' },
] as const;

function normalizeGoal(goal: Goal & { _id?: string }): Goal {
  return {
    ...goal,
    // eslint-disable-next-line no-underscore-dangle -- campo `_id` retornado pela API MongoDB
    id: goal.id ?? goal._id ?? '',
  };
}

export function createEmptyGoalsData(): GoalsApiData {
  const startDate = toIsoDate(new Date());

  return {
    vision: '',
    cycle: {
      currentWeek: 1,
      totalWeeks: CYCLE_WEEKS,
      startDate,
      endDate: addWeeks(startDate, CYCLE_WEEKS),
    },
    mainGoal: {
      id: 'main-1',
      name: '',
      label: '',
      points: 0,
      description: '',
    },
    secondaryGoals: [],
  };
}

export async function fetchGoals(): Promise<GoalsApiData> {
  const response = await api.get<GoalsApiData>('/goals');
  return {
    ...response,
    mainGoal: normalizeGoal(response.mainGoal),
    secondaryGoals: (response.secondaryGoals ?? []).map(normalizeGoal),
  };
}

export const MOCK_GOALS_DATA: GoalsData = {
  vision: 'Perder 15kg, lançar o Flowly e melhorar minhas finanças.',
  cycle: {
    currentWeek: 1,
    totalWeeks: 12,
    startDate: '2026-06-01',
    endDate: '2026-08-24',
  },
  mainGoal: {
    id: 'main-1',
    name: 'Perder 9kg',
    label: 'CORPO',
    points: 160,
    description: 'Reduzir gordura corporal de 25% para 15% em 12 semanas',
  },
  secondaryGoals: [
    { id: 'sec-1', name: 'Lançar MVP do Flowly', label: 'FLOWLY', points: 200, description: 'Chegar a 100 usuários pagantes' },
    { id: 'sec-2', name: 'Ler 3 Livros', label: 'LEITURA', points: 50, description: 'Livro 1, Livro 2 e Livro 3' },
  ],
  history: [],
};
