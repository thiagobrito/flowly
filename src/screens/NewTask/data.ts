import type { LucideIcon } from 'lucide-react-native';
import { CalendarClock, CalendarRange, CircleCheckBig, Repeat, Sun } from 'lucide-react-native';

import { LIFE_AREAS, type LifeArea } from '../common';

export type FrequencyId = 'once' | 'daily' | 'weekly' | 'interval' | 'trigger' | 'notime';

export type Frequency = {
  id: FrequencyId;
  label: string;
  Icon: LucideIcon;
};

export type FrequencyConfig =
  | { kind: 'notime' }
  | { kind: 'once'; date: string | null; time: string | null }
  | { kind: 'daily'; everyDay: boolean; days: number[] }
  | { kind: 'weekly'; mode: 'count' | 'days'; count: number; days: number[] }
  | { kind: 'interval'; everyNDays: number }
  | { kind: 'trigger'; eventId: string | null };

export type TriggerEvent = {
  id: string;
  label: string;
};

export type NewTaskPayload = {
  name: string;
  energy: number;
  impact: number;
  frequency: FrequencyConfig;
  area: string;
};

export const FREQUENCIES: Frequency[] = [
  { id: 'notime', label: 'Qualquer hora', Icon: CircleCheckBig },
  { id: 'once', label: 'Data Específica', Icon: CalendarClock },
  { id: 'daily', label: 'Diária', Icon: Sun },
  { id: 'weekly', label: 'Semanal', Icon: CalendarRange },
  { id: 'interval', label: 'Intervalo', Icon: Repeat },
  // { id: 'trigger', label: 'Gatilho', Icon: Link2 },
];

export const WEEKDAYS = [
  { index: 0, label: 'Dom' },
  { index: 1, label: 'Seg' },
  { index: 2, label: 'Ter' },
  { index: 3, label: 'Qua' },
  { index: 4, label: 'Qui' },
  { index: 5, label: 'Sex' },
  { index: 6, label: 'Sáb' },
] as const;

export const TRIGGER_EVENTS: TriggerEvent[] = [
  { id: 'wakeup', label: 'Ao acordar' },
  { id: 'breakfast', label: 'Após o café' },
  { id: 'lunch', label: 'Após o almoço' },
  { id: 'dinner', label: 'Após o jantar' },
  { id: 'sleep', label: 'Antes de dormir' },
];

export const DEFAULT_FREQUENCY_CONFIG: Record<FrequencyId, FrequencyConfig> = {
  notime: { kind: 'notime' },
  once: { kind: 'once', date: null, time: null },
  daily: { kind: 'daily', everyDay: true, days: [] },
  weekly: { kind: 'weekly', mode: 'count', count: 1, days: [] },
  interval: { kind: 'interval', everyNDays: 1 },
  trigger: { kind: 'trigger', eventId: null },
};

export function isFrequencyConfigValid(config: FrequencyConfig | null): config is FrequencyConfig {
  if (!config) return false;

  switch (config.kind) {
    case 'once':
      return config.date !== null;
    case 'daily':
      return config.everyDay || config.days.length > 0;
    case 'weekly':
      return config.mode === 'count' ? config.count >= 1 : config.days.length > 0;
    case 'interval':
      return config.everyNDays >= 1;
    case 'trigger':
      return config.eventId !== null;
    case 'notime':
      return true;
    default:
      return false;
  }
}

export const LEVEL_LABELS = ['Muito baixo', 'Baixo', 'Médio', 'Alto', 'Muito alto'] as const;

export type Task = {
  id: string;
  randomId: string;
  name: string;
  area: string;
  energy?: number;
  impact?: number;
  frequency: FrequencyConfig;
  completed?: string[];
};

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;

export function getLifeArea(id: string): LifeArea | undefined {
  return LIFE_AREAS.find((area) => area.id === id);
}

export function getFrequencyMeta(kind: FrequencyId): Frequency | undefined {
  return FREQUENCIES.find((frequency) => frequency.id === kind);
}

const formatDayList = (days: number[]): string =>
  days
    .slice()
    .sort((a, b) => a - b)
    .map((index) => WEEKDAYS.find((day) => day.index === index)?.label)
    .filter(Boolean)
    .join(', ');

export function describeFrequency(config: FrequencyConfig): string {
  switch (config.kind) {
    case 'once': {
      if (!config.date) return 'Pontual';
      const [, month = 1, day = 1] = config.date.split('-').map(Number);
      const formatted = `${day} ${MONTHS_SHORT[month - 1] ?? ''}`.trim();
      return config.time ? `${formatted}, ${config.time}` : formatted;
    }
    case 'daily':
      if (config.everyDay) return 'Todo dia';
      if (config.days.length > 0) return formatDayList(config.days);
      return 'Diária';
    case 'weekly':
      if (config.mode === 'count') {
        return `${config.count}x por semana`;
      }
      return config.days.length > 0 ? formatDayList(config.days) : 'Semanal';
    case 'interval':
      return config.everyNDays === 1 ? 'A cada dia' : `A cada ${config.everyNDays} dias`;
    case 'trigger': {
      const event = TRIGGER_EVENTS.find((item) => item.id === config.eventId);
      return event?.label ?? 'Gatilho';
    }
    default:
      return '';
  }
}
