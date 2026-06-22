import { Text, View } from 'react-native';

import type { GoalHealth } from '../data';
import { HEALTH_DOT_COLOR } from '../data';

type HealthDiagnosticsProps = {
  health: GoalHealth[];
};

export default function HealthDiagnostics({ health }: HealthDiagnosticsProps) {
  return (
    <View className="gap-2">
      {health.map((item) => (
        <View key={item.id} className="flex-row items-center gap-2.5">
          <View className="size-2.5 rounded-full" style={{ backgroundColor: HEALTH_DOT_COLOR[item.level] }} />
          <Text className="flex-1 text-sm text-zinc-700 dark:text-zinc-200">{item.label}</Text>
        </View>
      ))}
    </View>
  );
}
