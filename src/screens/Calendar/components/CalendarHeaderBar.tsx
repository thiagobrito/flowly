import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

export type CalendarViewMode = 'day' | 'week';

type CalendarHeaderBarProps = {
  dateLabel: string;
  isDark: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

export default function CalendarHeaderBar({ dateLabel, isDark, onPrev, onNext, onToday }: CalendarHeaderBarProps) {
  const iconColor = isDark ? '#e4e4e7' : '#3f3f46';

  return (
    <View className="mb-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Calendário</Text>
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Pressable onPress={onPrev} accessibilityRole="button" accessibilityLabel="Anterior" className="size-9 items-center justify-center rounded-full active:opacity-60">
          <ChevronLeft size={22} color={iconColor} />
        </Pressable>

        <Pressable onPress={onToday} accessibilityRole="button" className="flex-1 items-center active:opacity-60">
          <Text className="text-base font-semibold capitalize text-zinc-700 dark:text-zinc-200">{dateLabel}</Text>
        </Pressable>

        <Pressable onPress={onNext} accessibilityRole="button" accessibilityLabel="Próximo" className="size-9 items-center justify-center rounded-full active:opacity-60">
          <ChevronRight size={22} color={iconColor} />
        </Pressable>
      </View>
    </View>
  );
}
