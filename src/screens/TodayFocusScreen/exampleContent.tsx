import { Clock, Play } from 'lucide-react-native';
import { Image, Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

/* -------------------------------------------------------------------------- */
/* Tipos dos itens de exemplo                                                  */
/* -------------------------------------------------------------------------- */

export type WeekDay = {
  weekday: string;
  date: number;
  hasTask: boolean;
};

export type TaskItem = {
  id: string;
  kind: 'task';
  label: string;
  title: string;
  description: string;
  durationLabel: string;
  buttonLabel: string;
  avatarUrl?: string;
  onStart?: () => void;
  /** Quando true, a tela mostra o seletor de semana no footer deste item. */
  showWeek?: boolean;
};

export type ProgressItem = {
  id: string;
  kind: 'progress';
  progress: number; // 0..100
  caption: string;
  days: WeekDay[];
};

export type DeckItem = TaskItem | ProgressItem;

/* -------------------------------------------------------------------------- */
/* Anel de progresso (SVG)                                                     */
/* -------------------------------------------------------------------------- */

type ProgressRingProps = {
  progress: number;
  size?: number;
  strokeWidth?: number;
  isDark: boolean;
};

export const ProgressRing = ({
  progress,
  size = 80,
  strokeWidth = 7,
  isDark,
}: ProgressRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, progress));
  const dashOffset = circumference * (1 - clamped / 100);

  const trackColor = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';
  const progressColor = isDark ? '#ffffff' : '#18181b';

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={progressColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
};

/* -------------------------------------------------------------------------- */
/* Card de tarefa                                                              */
/* -------------------------------------------------------------------------- */

export const TaskCardContent = ({
  item,
  isDark,
}: {
  item: TaskItem;
  isDark: boolean;
}) => (
  <View className="flex-1">
    <View className="flex-row items-center justify-between">
      <Text className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {item.label}
      </Text>
      {item.avatarUrl ? (
        <View className="h-9 w-9 overflow-hidden rounded-full border border-white/60">
          <Image source={{ uri: item.avatarUrl }} className="h-9 w-9" />
        </View>
      ) : (
        <View className="h-9 w-9 rounded-full bg-zinc-300 dark:bg-zinc-700" />
      )}
    </View>

    <View className="mt-4 flex-1">
      <Text className="text-3xl font-bold leading-tight text-zinc-900 dark:text-zinc-50">
        {item.title}
      </Text>
      <Text
        className="mt-3 text-base leading-relaxed text-zinc-500 dark:text-zinc-400"
        numberOfLines={3}
      >
        {item.description}
      </Text>
    </View>

    <View className="mt-auto flex-row items-center justify-between">
      <Pressable
        onPress={item.onStart}
        accessibilityRole="button"
        accessibilityLabel={item.buttonLabel}
        className="flex-row items-center rounded-full bg-black px-3 py-2 active:opacity-80"
      >
        <View className="mr-2 h-7 w-7 items-center justify-center rounded-full bg-red-500">
          <Play size={14} color="#ffffff" fill="#ffffff" />
        </View>
        <Text className="pr-3 text-base font-semibold text-white">
          {item.buttonLabel}
        </Text>
      </Pressable>

      <View className="flex-row items-center">
        <Clock size={16} color={isDark ? '#a1a1aa' : '#71717a'} />
        <Text className="ml-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          {item.durationLabel}
        </Text>
      </View>
    </View>
  </View>
);

/* -------------------------------------------------------------------------- */
/* Card de progresso                                                          */
/* -------------------------------------------------------------------------- */

export const ProgressCardContent = ({
  item,
  isDark,
}: {
  item: ProgressItem;
  isDark: boolean;
}) => (
  <View className="flex-1">
    <Text className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
      Overall progress a
    </Text>

    <View className="flex-1 items-center justify-center">
      <View className="relative h-20 w-20 items-center justify-center">
        <ProgressRing progress={item.progress} isDark={isDark} />
        <Text className="absolute text-xl font-bold text-zinc-900 dark:text-zinc-50">
          {Math.round(item.progress)}%
        </Text>
      </View>

      <Text
        className="mt-3 text-center text-base text-zinc-500 dark:text-zinc-400"
        numberOfLines={2}
      >
        {item.caption}
      </Text>

      <View className="mt-4 flex-row justify-center gap-2">
        {item.days.map((day) => (
          <View key={`${day.weekday}-${day.date}`} className="items-center">
            <View
              className={
                day.hasTask
                  ? 'h-2 w-2 rounded-full bg-zinc-800 dark:bg-zinc-200'
                  : 'h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-600'
              }
            />
            <Text className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
              {day.weekday}
            </Text>
          </View>
        ))}
      </View>
    </View>

    <View className="mt-auto" />
  </View>
);
