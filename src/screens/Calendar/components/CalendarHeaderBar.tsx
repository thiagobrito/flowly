import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

export type CalendarViewMode = 'day' | 'week';

type CalendarHeaderBarProps = {
  viewMode: CalendarViewMode;
  dateLabel: string;
  isDark: boolean;
  onChangeViewMode: (mode: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

const MODES: { id: CalendarViewMode; label: string }[] = [
  { id: 'day', label: 'Dia' },
  { id: 'week', label: 'Semana' },
];

function SegmentButton({ label, active, isDark, onPress }: { label: string; active: boolean; isDark: boolean; onPress: () => void }) {
  let background = 'transparent';
  if (active) background = isDark ? '#3f3f46' : '#ffffff';

  let textColor = isDark ? '#a1a1aa' : '#71717a';
  if (active) textColor = isDark ? '#fafafa' : '#18181b';

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} className="rounded-xl px-4 py-1.5 active:opacity-70" style={{ backgroundColor: background }}>
      <Text className="text-sm font-semibold" style={{ color: textColor }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function CalendarHeaderBar({ viewMode, dateLabel, isDark, onChangeViewMode, onPrev, onNext, onToday }: CalendarHeaderBarProps) {
  const iconColor = isDark ? '#e4e4e7' : '#3f3f46';

  return (
    <View className="mb-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Calendário</Text>

        <View className="flex-row rounded-2xl bg-zinc-200/70 p-1 dark:bg-zinc-800/70">
          {MODES.map((mode) => (
            <SegmentButton key={mode.id} label={mode.label} active={viewMode === mode.id} isDark={isDark} onPress={() => onChangeViewMode(mode.id)} />
          ))}
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Pressable onPress={onPrev} accessibilityRole="button" accessibilityLabel="Anterior" className="size-9 items-center justify-center rounded-full active:opacity-60">
          <ChevronLeft size={22} color={iconColor} />
        </Pressable>

        <Pressable onPress={onToday} accessibilityRole="button" className="flex-1 items-center active:opacity-60">
          <Text className="text-base font-semibold capitalize text-zinc-700 dark:text-zinc-200">{dateLabel}</Text>
          <Text className="text-[11px] font-medium uppercase tracking-wide text-blue-500">Hoje</Text>
        </Pressable>

        <Pressable onPress={onNext} accessibilityRole="button" accessibilityLabel="Próximo" className="size-9 items-center justify-center rounded-full active:opacity-60">
          <ChevronRight size={22} color={iconColor} />
        </Pressable>
      </View>
    </View>
  );
}
