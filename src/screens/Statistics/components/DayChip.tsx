import { Pressable, Text } from 'react-native';

import type { ProgressDay } from '../types';

export default function DayChip({ day, onPress }: { day: ProgressDay; onPress: () => void }) {
  if (day.isToday) {
    return (
      <Pressable onPress={onPress} className="rounded-full bg-blue-500 px-4 py-3">
        <Text className="text-sm font-semibold text-white">{day.label ?? day.day}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} className="size-12 items-center justify-center rounded-full bg-white/70 dark:bg-white/10">
      <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-300">{day.day}</Text>
    </Pressable>
  );
}
