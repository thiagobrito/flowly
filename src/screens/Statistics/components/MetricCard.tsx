import { Text, View } from 'react-native';

import type { ProgressMetric } from '../types';

export default function MetricCard({ metric, isDark }: { metric: ProgressMetric; isDark: boolean }) {
  return (
    <View
      className="flex-1 rounded-2xl bg-white p-4 dark:bg-white/10"
      style={{
        shadowColor: '#1e3a8a',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.25 : 0.08,
        shadowRadius: 12,
        elevation: 4,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{metric.label}</Text>
        <View className="size-7 items-center justify-center rounded-full" style={{ backgroundColor: `${metric.accent}22` }}>
          <metric.Icon size={15} color={metric.accent} />
        </View>
      </View>
      <View className="mt-4 flex-row items-baseline">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{metric.value}</Text>
        {metric.unit ? <Text className="ml-1 text-sm font-medium text-zinc-400 dark:text-zinc-500">{metric.unit}</Text> : null}
      </View>
    </View>
  );
}
