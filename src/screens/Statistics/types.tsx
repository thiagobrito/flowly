import type { LucideIcon } from 'lucide-react-native';

import type { Task } from '../NewTask/data';

export type ProgressDay = {
  /** ISO date (`YYYY-MM-DD`), usado como chave e para o request. */
  date: string;
  /** Dia do mês exibido no chip. */
  day: number;
  /** Quando preenchido, o chip mostra esse texto (ex.: "Hoje, 22 abr"). */
  label?: string;
  isToday?: boolean;
};

export type ProgressGear = {
  shoe: string;
  watch: string;
};

export type ProgressDaily = {
  title: string;
  concludedTasks: number;
  /** 0–100. */
  percent: number;
  areas: string[];
};

export type ProgressStat = {
  id: string;
  value: string;
  label: string;
  /** Destaca o card central (com ícone). */
  highlighted?: boolean;
  area: string;
};

export type ProgressMetric = {
  id: string;
  label: string;
  value: string;
  unit?: string;
  Icon: LucideIcon;
  accent: string;
};

export type ProgressData = {
  totalScore: number;
  totalPoints: number;
  averageFromLast7Days: number;
  title: string;
  impactScore: number;
  energyScore: number;
  selectedDay: string;
  days: ProgressDay[];
  daily: ProgressDaily;
  stats: ProgressStat[];
  metrics: ProgressMetric[];
  concludedTasks: Task[];
};
