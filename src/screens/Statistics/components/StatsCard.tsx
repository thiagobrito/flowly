import { Text, View } from 'react-native';

import { GetLifeArea } from '../../common';
import type { ProgressStat } from '../types';

export default function StatCard({ stat, isDark }: { stat: ProgressStat; isDark: boolean }) {
  const area = GetLifeArea(stat.area);
  if (!area) return null;

  const { Icon } = area;

  return (
    <View
      className={`flex-1 rounded-2xl bg-white px-4 py-3 dark:bg-white/10 ${stat.highlighted ? 'border border-blue-500 dark:border-blue-500/20' : ''}`}
      style={{
        shadowColor: '#1e3a8a',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.25 : 0.08,
        shadowRadius: 12,
        elevation: 4,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-bold text-zinc-900 dark:text-zinc-50">{stat.value}</Text>
        <Icon size={24} color={area.accent} />
      </View>
      <Text className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">{stat.label}</Text>
    </View>
  );
}
