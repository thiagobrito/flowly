import type { LucideIcon } from 'lucide-react-native';
import { Bird, BookOpen, Briefcase, GoalIcon, HeartPulse, Home, Smile, Sparkles, Users, Wallet } from 'lucide-react-native';

export type LifeArea = {
  id: string;
  label: string;
  Icon: LucideIcon;
  accent: string;
};

export const LIFE_AREAS: LifeArea[] = [
  { id: 'health', label: 'Saúde', Icon: HeartPulse, accent: '#22c55e' },
  { id: 'finance', label: 'Financeiro', Icon: Wallet, accent: '#eab308' },
  { id: 'work', label: 'Trabalho', Icon: Briefcase, accent: '#3b82f6' },
  { id: 'relationships', label: 'Relacionamentos', Icon: Users, accent: '#ec4899' },
  { id: 'studies', label: 'Estudos', Icon: BookOpen, accent: '#8b5cf6' },
  { id: 'leisure', label: 'Lazer', Icon: Smile, accent: '#f97316' },
  { id: 'home', label: 'Casa', Icon: Home, accent: '#14b8a6' },
  { id: 'spirituality', label: 'Espiritualidade', Icon: Sparkles, accent: '#a855f7' },
  { id: 'other', label: 'Outros', Icon: Bird, accent: '#a855f7' },
  { id: 'goal', label: 'Metas', Icon: GoalIcon, accent: '#22c55e' },
];

export function resolveLifeAreaId(value?: string | null): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return 'goal';

  const exact = LIFE_AREAS.find((area) => area.id === trimmed);
  if (exact) return exact.id;

  const lower = trimmed.toLowerCase();
  const byId = LIFE_AREAS.find((area) => area.id === lower);
  if (byId) return byId.id;

  const byLabel = LIFE_AREAS.find((area) => area.label.toLowerCase() === lower);
  if (byLabel) return byLabel.id;

  return trimmed;
}

export function GetLifeArea(id: string): LifeArea {
  const resolvedId = resolveLifeAreaId(id);
  const result = LIFE_AREAS.find((area) => area.id === resolvedId);
  if (result) return result;

  return { id: resolvedId, label: id, Icon: GoalIcon, accent: '#22c55e' };
}
