import { Text, View } from 'react-native';

import ProgressBar from '@/screens/Config/Goals/components/ProgressBar';

import type { GoalMetric } from '../data';

type MetricRowProps = {
  metric: GoalMetric;
  isDark: boolean;
  accent: string;
};

function formatValue(value: number, unit: string) {
  if (!unit) return `${value}`;
  if (unit === 'R$') return `${unit} ${value.toLocaleString('pt-BR')}`;
  if (unit === '%') return `${value}%`;
  return `${value} ${unit}`;
}

export default function MetricRow({ metric, isDark, accent }: MetricRowProps) {
  const { current, target, unit } = metric;
  const ratio = target === 0 ? 0 : Math.round((current / target) * 100);
  const progress = Math.min(100, Math.max(0, ratio));
  const gap = Math.abs(target - current);

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{metric.label}</Text>
        <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {formatValue(current, unit)}
          <Text className="text-xs font-normal text-zinc-400 dark:text-zinc-500"> / {formatValue(target, unit)}</Text>
        </Text>
      </View>
      <ProgressBar progress={progress} isDark={isDark} color={accent} />
      <Text className="text-xs text-zinc-500 dark:text-zinc-400">Faltam {formatValue(gap, unit)}</Text>
    </View>
  );
}
