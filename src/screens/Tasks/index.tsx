import { Check, TrendingUp, Zap } from 'lucide-react-native';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import type { Task } from '../NewTask/data';
import {
  describeFrequency,
  getFrequencyMeta,
  getLifeArea,
  SAMPLE_TASKS,
} from '../NewTask/data';

type TasksProps = {
  tasks?: Task[];
  onSelect?: (task: Task) => void;
};

const LEVEL_DOTS = [1, 2, 3, 4, 5] as const;

function LevelDots({
  value,
  accent,
  isDark,
}: {
  value: number;
  accent: string;
  isDark: boolean;
}) {
  const emptyColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)';

  return (
    <View className="flex-row items-center">
      {LEVEL_DOTS.map((level) => (
        <View
          key={level}
          className="h-1.5 w-1.5 rounded-full"
          style={{
            marginRight: level === LEVEL_DOTS.length ? 0 : 3,
            backgroundColor: level <= value ? accent : emptyColor,
          }}
        />
      ))}
    </View>
  );
}

function TaskCard({
  task,
  selected,
  isDark,
  onPress,
}: {
  task: Task;
  selected: boolean;
  isDark: boolean;
  onPress: () => void;
}) {
  const area = getLifeArea(task.area);
  const accent = area?.accent ?? '#71717a';
  const AreaIcon = area?.Icon;
  const freqMeta = getFrequencyMeta(task.frequency.kind);
  const FreqIcon = freqMeta?.Icon;

  let borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)';
  let backgroundColor = isDark
    ? 'rgba(255,255,255,0.05)'
    : 'rgba(255,255,255,0.85)';

  if (selected) {
    borderColor = accent;
    backgroundColor = `${accent}14`;
  }

  const mutedColor = isDark ? '#a1a1aa' : '#71717a';
  const hasMetrics =
    typeof task.energy === 'number' || typeof task.impact === 'number';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className="mb-3 active:opacity-80"
    >
      <View
        className="flex-row items-center overflow-hidden rounded-2xl p-3"
        style={{ borderColor, backgroundColor, borderWidth: 1.5 }}
      >
        <View
          className="h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${accent}22` }}
        >
          {AreaIcon ? <AreaIcon size={20} color={accent} /> : null}
        </View>

        <View className="ml-3 flex-1">
          <Text
            className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
            numberOfLines={1}
          >
            {task.name}
          </Text>

          <View className="mt-1.5 flex-row items-center">
            {area ? (
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: `${accent}22`, marginRight: 8 }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: accent }}
                >
                  {area.label}
                </Text>
              </View>
            ) : null}

            <View className="flex-1 flex-row items-center">
              {FreqIcon ? (
                <FreqIcon
                  size={13}
                  color={mutedColor}
                  style={{ marginRight: 5 }}
                />
              ) : null}
              <Text
                className="flex-1 text-xs font-medium"
                style={{ color: mutedColor }}
                numberOfLines={1}
              >
                {describeFrequency(task.frequency)}
              </Text>
            </View>
          </View>

          {hasMetrics ? (
            <View className="mt-2.5 flex-row items-center">
              {typeof task.energy === 'number' ? (
                <View
                  className="flex-row items-center"
                  style={{ marginRight: 18 }}
                >
                  <Zap size={13} color="#22c55e" style={{ marginRight: 6 }} />
                  <LevelDots
                    value={task.energy}
                    accent="#22c55e"
                    isDark={isDark}
                  />
                </View>
              ) : null}

              {typeof task.impact === 'number' ? (
                <View className="flex-row items-center">
                  <TrendingUp
                    size={13}
                    color="#3b82f6"
                    style={{ marginRight: 6 }}
                  />
                  <LevelDots
                    value={task.impact}
                    accent="#3b82f6"
                    isDark={isDark}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View className="ml-2 h-6 w-6 items-center justify-center">
          {selected ? (
            <View
              className="h-6 w-6 items-center justify-center rounded-full"
              style={{ backgroundColor: accent }}
            >
              <Check size={14} color="#ffffff" />
            </View>
          ) : (
            <View
              className="h-5 w-5 rounded-full border"
              style={{
                borderColor: isDark
                  ? 'rgba(255,255,255,0.16)'
                  : 'rgba(0,0,0,0.12)',
              }}
            />
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function Tasks({ tasks = SAMPLE_TASKS, onSelect }: TasksProps) {
  const isDark = useColorScheme() === 'dark';
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (task: Task) => {
    setSelectedId(task.id);
    onSelect?.(task);
  };

  return (
    <View className="flex-1">
      <View className="mb-1 flex-row items-end justify-between">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Suas atividades
        </Text>
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">
          {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
        </Text>
      </View>
      <Text className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Toque para selecionar uma atividade.
      </Text>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            selected={selectedId === task.id}
            isDark={isDark}
            onPress={() => handleSelect(task)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
