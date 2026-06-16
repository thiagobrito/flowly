import { Clock, TrendingUp, Zap } from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import type { Task } from '../../NewTask/data';
import { formatDuration, getLifeArea } from '../../NewTask/data';
import LevelDots from '../../Tasks/components/LevelDots';
import { getTaskDurationMin } from '../eventMapping';

type UnscheduledTrayProps = {
  tasks: Task[];
  isDark: boolean;
  scrollEnabled: boolean;
  onDragStart: (task: Task, x: number, y: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (task: Task, x: number, y: number) => void;
};

function TaskChip({
  task,
  isDark,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  task: Task;
  isDark: boolean;
  onDragStart: (task: Task, x: number, y: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (task: Task, x: number, y: number) => void;
}) {
  const accent = getLifeArea(task.area)?.accent ?? '#6366f1';
  const background = isDark ? 'rgba(39,39,42,0.7)' : 'rgba(255,255,255,0.8)';
  const titleColor = isDark ? '#fafafa' : '#18181b';
  const metaColor = isDark ? '#a1a1aa' : '#71717a';
  const borderColor = isDark ? '#3f3f46' : '#e4e4e7';

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(8)
        .onStart((event) => {
          runOnJS(onDragStart)(task, event.absoluteX, event.absoluteY);
        })
        .onUpdate((event) => {
          runOnJS(onDragMove)(event.absoluteX, event.absoluteY);
        })
        .onEnd((event) => {
          runOnJS(onDragEnd)(task, event.absoluteX, event.absoluteY);
        }),
    [task, onDragEnd, onDragMove, onDragStart],
  );

  return (
    <GestureDetector gesture={pan}>
      <View accessibilityRole="button" className="mr-2 rounded-2xl border px-3 py-2" style={{ backgroundColor: background, borderColor, maxWidth: 200 }}>
        <View className="mb-2 flex-row items-center">
          <View className="mr-2 size-2.5 rounded-full" style={{ backgroundColor: accent }} />
          <Text numberOfLines={1} className="text-sm font-semibold" style={{ color: titleColor }}>
            {task.name}
          </Text>
        </View>
        <View className="flex-col gap-1">
          <View className="flex flex-row">
            <Clock size={13} color="#14b8a6" style={{ marginRight: 6 }} />
            <Text className="text-[11px]" style={{ color: metaColor }}>
              {formatDuration(getTaskDurationMin(task))}
            </Text>
          </View>
          <View className="flex flex-row">
            <Zap size={13} color="#22c55e" style={{ marginRight: 6 }} />
            <LevelDots value={task.energy || 0} accent="#22c55e" isDark={isDark} />
          </View>
          <View className="flex flex-row">
            <TrendingUp size={13} color="#3b82f6" style={{ marginRight: 6 }} />
            <LevelDots value={task.impact || 0} accent="#3b82f6" isDark={isDark} />
          </View>
        </View>
      </View>
    </GestureDetector>
  );
}

export default function UnscheduledTray({ tasks, isDark, scrollEnabled, onDragStart, onDragMove, onDragEnd }: UnscheduledTrayProps) {
  if (tasks.length === 0) return null;

  return (
    <View className="my-1">
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Sem horário</Text>
        <Text className="text-[11px] text-zinc-400 dark:text-zinc-500" numberOfLines={1} style={{ flexShrink: 1, marginLeft: 8 }}>
          Arraste uma tarefa até o horário no calendário
        </Text>
      </View>

      <ScrollView horizontal scrollEnabled={scrollEnabled} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {tasks.map((task) => (
          <TaskChip key={task.randomId || task.id} task={task} isDark={isDark} onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd} />
        ))}
      </ScrollView>
    </View>
  );
}
