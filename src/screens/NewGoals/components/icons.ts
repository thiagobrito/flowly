import type { LucideIcon } from 'lucide-react-native';
import { CalendarRange, CircleCheck, Flag, Gauge, Heart, Layers, Sparkles, Target, Trophy } from 'lucide-react-native';

/** Resolve o nome de ícone vindo do schema (backend) para um componente Lucide. */
const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  CalendarRange,
  Target,
  Flag,
  Trophy,
  Heart,
  Gauge,
  Layers,
  CircleCheck,
};

export function resolveIcon(name?: string): LucideIcon {
  if (name && ICON_MAP[name]) return ICON_MAP[name];
  return Sparkles;
}
