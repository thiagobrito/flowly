import type { Task } from '@/screens/NewTask/data';

import type { DayEnergyCurve } from './dayCurve';

export type CoachAction = {
  type: 'schedule';
  taskId: string;
  startISO: string;
  durationMin: number;
};

export type CoachInsight = {
  id: string;
  title: string;
  detail?: string;
  action?: CoachAction;
  actionLabel?: string;
};

export type CoachInput = {
  dateKey: string;
  /** Quantizado em slots de 15 min por `quantizeNow`, para as sugestões não oscilarem. */
  now: Date;
  tasks: Task[];
  concluded: Task[];
  curve: DayEnergyCurve;
  /** Horas de sono da última noite — gatilho da regra de deep work. */
  lastNightSleepHours: number | null;
  /** Agenda de amanhã, para a regra de dívida de sono não sugerir slot ocupado. */
  tomorrowTasks?: Task[];
  /** Curva de amanhã, quando disponível. Sem ela, a de hoje é reusada. */
  tomorrowCurve?: DayEnergyCurve;
};
