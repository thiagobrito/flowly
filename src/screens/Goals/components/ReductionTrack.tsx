import { Text, View } from 'react-native';

type ReductionTrackProps = {
  isDark: boolean;
  accent: string;
};

export default function ReductionTrack({ isDark, accent }: ReductionTrackProps) {
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
