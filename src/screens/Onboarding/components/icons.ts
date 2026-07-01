import type { LucideIcon } from 'lucide-react-native';
import { BatteryCharging, Bell, CircleCheck, Crown, Flag, Gauge, Languages, ListChecks, Sparkles, Target, Timer, TrendingUp } from 'lucide-react-native';

/** Resolve o nome de ícone vindo do schema (backend) para um componente Lucide. */
const ICON_MAP: Record<string, LucideIcon> = {
  Languages,
  Sparkles,
  Target,
  ListChecks,
  TrendingUp,
  Timer,
  Flag,
  Gauge,
  Bell,
  Crown,
  CircleCheck,
  BatteryCharging,
};

export function resolveIcon(name?: string): LucideIcon {
  if (name && ICON_MAP[name]) return ICON_MAP[name];
  return Sparkles;
}
