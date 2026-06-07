import type { LucideIcon } from 'lucide-react-native';
import {
  BookOpen,
  Briefcase,
  CalendarRange,
  HeartPulse,
  Home,
  Link2,
  Repeat,
  Smile,
  Sparkles,
  Sun,
  Target,
  Users,
  Wallet,
} from 'lucide-react-native';

export type LifeArea = {
  id: string;
  label: string;
  Icon: LucideIcon;
  accent: string;
};

export type FrequencyId = 'once' | 'daily' | 'weekly' | 'interval' | 'trigger';

export type Frequency = {
  id: FrequencyId;
  label: string;
  Icon: LucideIcon;
};

export type FrequencyConfig =
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

export const LIFE_AREAS: LifeArea[] = [
  { id: 'health', label: 'Saúde', Icon: HeartPulse, accent: '#22c55e' },
  { id: 'finance', label: 'Financeiro', Icon: Wallet, accent: '#eab308' },
  { id: 'work', label: 'Trabalho', Icon: Briefcase, accent: '#3b82f6' },
  {
    id: 'relationships',
    label: 'Relacionamentos',
    Icon: Users,
    accent: '#ec4899',
  },
  { id: 'studies', label: 'Estudos', Icon: BookOpen, accent: '#8b5cf6' },
  { id: 'leisure', label: 'Lazer', Icon: Smile, accent: '#f97316' },
  { id: 'home', label: 'Casa', Icon: Home, accent: '#14b8a6' },
  {
    id: 'spirituality',
    label: 'Espiritualidade',
    Icon: Sparkles,
    accent: '#a855f7',
  },
];

export const FREQUENCIES: Frequency[] = [
  { id: 'once', label: 'Pontual', Icon: Target },
  { id: 'daily', label: 'Diária', Icon: Sun },
  { id: 'weekly', label: 'Semanal', Icon: CalendarRange },
  { id: 'interval', label: 'Intervalo', Icon: Repeat },
  { id: 'trigger', label: 'Gatilho', Icon: Link2 },
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
  once: { kind: 'once', date: null, time: null },
  daily: { kind: 'daily', everyDay: true, days: [] },
  weekly: { kind: 'weekly', mode: 'count', count: 1, days: [] },
  interval: { kind: 'interval', everyNDays: 1 },
  trigger: { kind: 'trigger', eventId: null },
};

export function isFrequencyConfigValid(
  config: FrequencyConfig | null,
): config is FrequencyConfig {
  if (!config) return false;

  switch (config.kind) {
    case 'once':
      return config.date !== null;
    case 'daily':
      return config.everyDay || config.days.length > 0;
    case 'weekly':
      return config.mode === 'count'
        ? config.count >= 1
        : config.days.length > 0;
    case 'interval':
      return config.everyNDays >= 1;
    case 'trigger':
      return config.eventId !== null;
    default:
      return false;
  }
}

export const LEVEL_LABELS = [
  'Muito baixo',
  'Baixo',
  'Médio',
  'Alto',
  'Muito alto',
] as const;

export type Task = {
  id: string;
  name: string;
  area: string;
  energy?: number;
  impact?: number;
  frequency: FrequencyConfig;
};

export const SAMPLE_TASKS: Task[] = [
  {
    id: 't1',
    name: 'Consulta médica',
    area: 'health',
    energy: 2,
    impact: 5,
    frequency: { kind: 'once', date: '2026-06-12', time: '14:00' },
  },
  {
    id: 't2',
    name: 'Beber 2L de água',
    area: 'health',
    energy: 1,
    impact: 3,
    frequency: { kind: 'daily', everyDay: true, days: [] },
  },
  {
    id: 't3',
    name: 'Treino na academia',
    area: 'leisure',
    energy: 4,
    impact: 4,
    frequency: { kind: 'daily', everyDay: false, days: [1, 3, 5] },
  },
  {
    id: 't4',
    name: 'Ligar para a família',
    area: 'relationships',
    energy: 2,
    impact: 5,
    frequency: { kind: 'weekly', mode: 'count', count: 2, days: [] },
  },
  {
    id: 't5',
    name: 'Revisão financeira',
    area: 'finance',
    impact: 4,
    frequency: { kind: 'weekly', mode: 'days', count: 1, days: [1, 4] },
  },
  {
    id: 't6',
    name: 'Estudar inglês',
    area: 'studies',
    energy: 3,
    impact: 4,
    frequency: { kind: 'interval', everyNDays: 3 },
  },
  {
    id: 't7',
    name: 'Meditar',
    area: 'spirituality',
    energy: 1,
    frequency: { kind: 'trigger', eventId: 'wakeup' },
  },
  {
    id: 't8',
    name: 'Organizar a mesa',
    area: 'home',
    frequency: { kind: 'interval', everyNDays: 7 },
  },
];

const MONTHS_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

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
      return config.everyNDays === 1
        ? 'A cada dia'
        : `A cada ${config.everyNDays} dias`;
    case 'trigger': {
      const event = TRIGGER_EVENTS.find((item) => item.id === config.eventId);
      return event?.label ?? 'Gatilho';
    }
    default:
      return '';
  }
}
