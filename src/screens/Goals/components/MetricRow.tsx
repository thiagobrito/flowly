import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';

import ProgressBar from '@/screens/Config/Goals/components/ProgressBar';

import { formatMetricValue, type GoalMetric, resolveMetricDirection } from '../data';

type MetricRowProps = {
  metric: GoalMetric;
  isDark: boolean;
  accent: string;
};

function ReductionTrack({ isDark, accent }: { isDark: boolean; accent: string }) {
  return (
    <View className="gap-1.5">
      <View className="h-3 w-full flex-row items-center">
        <View className="size-3 rounded-full" style={{ backgroundColor: accent }} />
        <View className="mx-1 h-1.5 flex-1 rounded-full" style={{ backgroundColor: `${accent}66` }} />
        <View className="size-3 rounded-full" style={{ backgroundColor: isDark ? '#71717a' : '#a1a1aa' }} />
      </View>
      <View className="flex-row justify-between">
        <Text className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">Alvo</Text>
        <Text className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">Atual</Text>
      </View>
    </View>
  );
}

function MetricSuccess({ message, isDark }: { message: string; isDark: boolean }) {
  return (
    <View className="flex-row items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)' }}>
      <Check size={14} color="#22c55e" />
      <Text className="text-xs font-medium text-green-700 dark:text-green-400">{message}</Text>
    </View>
  );
}

export default function MetricRow({ metric, isDark, accent }: MetricRowProps) {
  const { current, target, unit } = metric;
  const direction = resolveMetricDirection(metric);
  const gap = Math.abs(target - current);

  if (direction === 'decrease' && current > target) {
    return (
      <View className="gap-1.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{metric.label}</Text>
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {formatMetricValue(current, unit)}
            <Text className="text-xs font-normal text-zinc-400 dark:text-zinc-500"> → {formatMetricValue(target, unit)}</Text>
          </Text>
        </View>
        <ReductionTrack isDark={isDark} accent={accent} />
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          Reduzir {formatMetricValue(gap, unit)} para chegar a {formatMetricValue(target, unit)}
        </Text>
      </View>
    );
  }

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

  const ratio = target === 0 ? 0 : Math.round((current / target) * 100);
  const progress = Math.min(100, Math.max(0, ratio));
  const caption = current >= target ? 'Meta atingida' : `Faltam ${formatMetricValue(gap, unit)}`;

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
