import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';

import ProgressBar from '@/screens/Config/Goals/components/ProgressBar';

import { computeMetricProgress, formatMetricValue, type GoalMetric, resolveMetricDirection, resolveMetricUnit } from '../data';

type MetricRowProps = {
  metric: GoalMetric;
  isDark: boolean;
  accent: string;
};

function MetricSuccess({ message, isDark }: { message: string; isDark: boolean }) {
  return (
    <View className="flex-row items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)' }}>
      <Check size={14} color="#22c55e" />
      <Text className="text-xs font-medium text-green-700 dark:text-green-400">{message}</Text>
    </View>
  );
}

export default function MetricRow({ metric, isDark, accent }: MetricRowProps) {
  const { current, target, initial } = metric;
  const unit = resolveMetricUnit(metric);
  const direction = resolveMetricDirection(metric);
  const gap = Math.abs(target - current);
  const progress = computeMetricProgress(metric);

  if (direction === 'decrease' && current <= target) {
    const message = current < target ? 'Abaixo do alvo' : 'Alvo atingido';
    return (
      <View className="gap-1.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{metric.label}</Text>
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {formatMetricValue(current, unit)}
            <Text className="text-xs font-normal text-zinc-400 dark:text-zinc-500"> / {formatMetricValue(target, unit)}</Text>
          </Text>
        </View>
        <MetricSuccess message={message} isDark={isDark} />
      </View>
    );
  }

  if (direction === 'decrease') {
    return (
      <View className="gap-1.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{metric.label}</Text>
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {formatMetricValue(current, unit)}
            <Text className="text-xs font-normal text-zinc-400 dark:text-zinc-500"> → {formatMetricValue(target, unit)}</Text>
          </Text>
        </View>
        <ProgressBar progress={progress} isDark={isDark} color={accent} />
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          De {formatMetricValue(initial, unit)} · Reduzir {formatMetricValue(gap, unit)} · {progress}%
        </Text>
      </View>
    );
  }

  const caption = current >= target ? 'Meta atingida' : `De ${formatMetricValue(initial, unit)} · Faltam ${formatMetricValue(gap, unit)} · ${progress}%`;

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{metric.label}</Text>
        <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {formatMetricValue(current, unit)}
          <Text className="text-xs font-normal text-zinc-400 dark:text-zinc-500"> / {formatMetricValue(target, unit)}</Text>
        </Text>
      </View>
      <ProgressBar progress={progress} isDark={isDark} color={accent} />
      <Text className="text-xs text-zinc-500 dark:text-zinc-400">{caption}</Text>
    </View>
  );
}
