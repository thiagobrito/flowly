import { Minus, TrendingDown, TrendingUp } from 'lucide-react-native';
import { Text, View } from 'react-native';

import type { ExecutionTrend } from '../data';
import { TREND_LABELS } from '../data';

type MomentumCardProps = {
  consistencyScore: number;
  weeklyStreak: number;
  trend: ExecutionTrend;
};

function TrendBadge({ trend }: { trend: ExecutionTrend }) {
  const config = {
    improving: { Icon: TrendingUp, color: '#22c55e' },
    stable: { Icon: Minus, color: '#eab308' },
    declining: { Icon: TrendingDown, color: '#ef4444' },
  }[trend];
  const { Icon, color } = config;

  return (
    <View className="flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1" style={{ backgroundColor: `${color}22` }}>
      <Icon size={13} color={color} />
      <Text className="text-xs font-semibold" style={{ color }}>
        {TREND_LABELS[trend]}
      </Text>
    </View>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 items-center gap-1">{children}</View>;
}

export default function MomentumCard({ consistencyScore, weeklyStreak, trend }: MomentumCardProps) {
  return (
    <View className="flex-row items-center justify-between">
      <Cell>
        <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{consistencyScore}%</Text>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">Consistência</Text>
      </Cell>
      <View className="h-9 w-px bg-black/5 dark:bg-white/10" />
      <Cell>
        <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">🔥 {weeklyStreak}</Text>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">Semanas seguidas</Text>
      </Cell>
      <View className="h-9 w-px bg-black/5 dark:bg-white/10" />
      <Cell>
        <TrendBadge trend={trend} />
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">Tendência</Text>
      </Cell>
    </View>
  );
}
