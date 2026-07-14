import { AlignLeft, Check, ChevronDown, ChevronRight, Clock, GoalIcon, Pencil, Trash2, TrendingUp, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { toLocalISOString } from '@/lib/date';
import { api } from '@/lib/network';
import { cancelTaskRemindersFor } from '@/lib/taskReminders';

import type { Subtask, Task } from '../../NewTask/data';
import { describeFrequency, formatDuration, getFrequencyMeta, getLifeArea } from '../../NewTask/data';
import LevelDots from './LevelDots';

const ACTION_WIDTH = 80;
const OPEN_THRESHOLD = ACTION_WIDTH / 2;
const SWIPE_VELOCITY = 600;
const SNAP_DURATION = 220;

type CheckIconProps = {
  isSelected: boolean;
  isDark: boolean;
  accent: string;
};

function CheckIcon({ isSelected, isDark, accent }: CheckIconProps) {
  if (isSelected) {
    return (
      <View className="size-6 items-center justify-center rounded-full" style={{ backgroundColor: accent }}>
        <Check size={14} color="#ffffff" />
      </View>
    );
  }
  return (
    <View
      className="size-5 rounded-full border"
      style={{
        borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)',
      }}
    />
  );
}

type TaskCardProps = {
  highlight: boolean;
  task: Task;
  selected: boolean;
  isDark: boolean;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function TaskCard({ highlight, task, selected, isDark, onComplete, onEdit, onDelete }: TaskCardProps) {
  const [isSelected, setIsSelected] = useState(selected);
  const [expanded, setExpanded] = useState(false);
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(task.subtasks ?? []);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const area = getLifeArea(task.goal.name);
  const accent = area?.accent ?? '#71717a';
  const AreaIcon = area?.Icon;
  const freqMeta = getFrequencyMeta(task.frequency.kind);
  const FreqIcon = freqMeta?.Icon;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const editStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 0 ? Math.min(1, translateX.value / OPEN_THRESHOLD) : 0,
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? Math.min(1, -translateX.value / OPEN_THRESHOLD) : 0,
  }));

  const close = () => {
    translateX.value = withTiming(0, { duration: SNAP_DURATION });
  };

  const handlePress = async () => {
    setIsSelected(!isSelected);

    try {
      if (isSelected) {
        await api.post('/tasks/undo', { taskId: task.id, date: toLocalISOString() });
      } else {
        await api.post('/tasks/complete', { taskId: task.id, date: toLocalISOString() });
        await cancelTaskRemindersFor(task.id);
      }
    } catch {
      setIsSelected((prev) => !prev);
      return;
    }

    scale.value = withTiming(0.96, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 }, (finished) => {
      if (finished) runOnJS(onComplete)();
    });
  };

  const handleEdit = () => {
    close();
    onEdit();
  };

  const handleDelete = () => {
    onDelete();
  };

  const toggleSubtask = async (subtask: Subtask) => {
    const nextDone = !subtask.done;
    setLocalSubtasks((prev) => prev.map((item) => (item.id === subtask.id ? { ...item, done: nextDone } : item)));

    try {
      await api.post('/tasks/subtask', { taskId: task.id, subtaskId: subtask.id, done: nextDone });
    } catch {
      setLocalSubtasks((prev) => prev.map((item) => (item.id === subtask.id ? { ...item, done: subtask.done } : item)));
    }
  };

  const hasSubtasks = localSubtasks.length > 0;
  const doneCount = localSubtasks.filter((item) => item.done).length;
  const description = task.description?.trim() ?? '';
  const hasDescription = description.length > 0;
  const canExpand = hasSubtasks || hasDescription;

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-12, 12])
    .onBegin(() => {
      startX.value = translateX.value;
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;
      translateX.value = Math.min(ACTION_WIDTH, Math.max(-ACTION_WIDTH, next));
    })
    .onEnd((e) => {
      const swipeLeft = e.translationX < -OPEN_THRESHOLD || e.velocityX < -SWIPE_VELOCITY;
      const swipeRight = e.translationX > OPEN_THRESHOLD || e.velocityX > SWIPE_VELOCITY;

      translateX.value = withTiming(0, { duration: SNAP_DURATION });

      if (swipeRight) runOnJS(onEdit)();
      else if (swipeLeft) runOnJS(onDelete)();
    });

  let borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)';
  let backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)';

  if (highlight) {
    borderColor = '#3b82f6';
  }

  if (isSelected) {
    borderColor = accent;
    backgroundColor = `${accent}14`;
  }
  const mutedColor = isDark ? '#a1a1aa' : '#71717a';
  return (
    <Animated.View className="mb-3" style={animatedStyle}>
      <View className="overflow-hidden rounded-2xl">
        <View className="absolute inset-0 min-h-[122px] w-full flex-row items-stretch justify-between">
          <Animated.View style={[{ width: ACTION_WIDTH }, editStyle]}>
            <Pressable onPress={handleEdit} accessibilityRole="button" accessibilityLabel={`Editar ${task.name}`} className="flex-1 items-center justify-center rounded-l-2xl active:opacity-80" style={{ backgroundColor: '#3b82f6' }}>
              <Pencil size={20} color="#ffffff" />
              <Text className="mt-1 text-xs font-semibold text-white">Editar</Text>
            </Pressable>
          </Animated.View>

          <Animated.View style={[{ width: ACTION_WIDTH }, deleteStyle]}>
            <Pressable onPress={handleDelete} accessibilityRole="button" accessibilityLabel={`Deletar ${task.name}`} className="flex-1 items-center justify-center rounded-r-2xl active:opacity-80" style={{ backgroundColor: '#ef4444' }}>
              <Trash2 size={20} color="#ffffff" />
              <Text className="mt-1 text-xs font-semibold text-white">Deletar</Text>
            </Pressable>
          </Animated.View>
        </View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={cardStyle}>
            <View accessibilityRole="button" accessibilityState={{ selected: isSelected }} className="active:opacity-80">
              <View className="overflow-hidden rounded-2xl" style={{ borderColor, backgroundColor, borderWidth: 1.5 }}>
                <View className="flex-row items-center p-3">
                  <View className="size-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accent}22` }}>
                    {AreaIcon ? <AreaIcon size={20} color={accent} /> : <GoalIcon size={20} color="#22c55e" />}
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{task.name}</Text>

                    <View className="mt-1.5 flex-row items-center">
                      <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${accent}22`, marginRight: 8 }}>
                        <Text className="text-xs font-semibold" style={{ color: accent }}>
                          {area?.label.toUpperCase() || task.goal.name.toUpperCase()}
                        </Text>
                      </View>

                      <View className="flex-1 flex-row items-center">
                        {FreqIcon ? <FreqIcon size={13} color={mutedColor} style={{ marginRight: 5 }} /> : null}
                        <Text className="flex-1 text-xs font-medium" style={{ color: mutedColor }} numberOfLines={1}>
                          {describeFrequency(task)}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-2.5 flex-row items-center">
                      <View className="flex-row items-center" style={{ marginRight: 18 }}>
                        <Zap size={13} color="#22c55e" style={{ marginRight: 6 }} />
                        <LevelDots value={task.energy || 0} accent="#22c55e" isDark={isDark} />
                      </View>

                      <View className="flex-row items-center">
                        <TrendingUp size={13} color="#3b82f6" style={{ marginRight: 6 }} />
                        <LevelDots value={task.impact || 0} accent="#3b82f6" isDark={isDark} />
                      </View>

                      {task.estimatedMinutes ? (
                        <View className="flex-row items-center" style={{ marginLeft: 18 }}>
                          <Clock size={13} color="#14b8a6" style={{ marginRight: 5 }} />
                          <Text className="text-xs font-semibold" style={{ color: '#14b8a6' }}>
                            {formatDuration(task.estimatedMinutes)}
                          </Text>
                        </View>
                      ) : null}

                      {canExpand ? (
                        <Pressable
                          onPress={() => setExpanded((prev) => !prev)}
                          accessibilityRole="button"
                          accessibilityLabel="Mostrar detalhes"
                          accessibilityState={{ expanded }}
                          className="ml-auto flex-row items-center rounded-full px-2 py-1 active:opacity-70"
                          style={{ backgroundColor: `${accent}1f` }}
                        >
                          {hasSubtasks ? (
                            <Text className="text-xs font-semibold" style={{ color: accent, marginRight: 4 }}>
                              {doneCount}/{localSubtasks.length}
                            </Text>
                          ) : (
                            <AlignLeft size={14} color={accent} style={{ marginRight: 4 }} />
                          )}
                          {expanded ? <ChevronDown size={16} color={accent} /> : <ChevronRight size={16} color={accent} />}
                        </Pressable>
                      ) : null}
                    </View>
                  </View>

                  <Pressable onPress={handlePress} accessibilityRole="button" accessibilityState={{ selected: isSelected }} className="active:opacity-80">
                    <View className="ml-2 size-6 items-center justify-center">
                      <CheckIcon isSelected={isSelected} isDark={isDark} accent={accent} />
                    </View>
                  </Pressable>
                </View>

                {canExpand && expanded ? (
                  <View className="px-3 pb-3">
                    <View className="border-t pt-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                      {hasDescription ? (
                        <View className={hasSubtasks ? 'mb-1 pb-1' : ''}>
                          <Text className="py-1 text-sm leading-5" style={{ color: isDark ? '#d4d4d8' : '#52525b' }}>
                            {description}
                          </Text>
                        </View>
                      ) : null}
                      {localSubtasks.map((subtask) => {
                        let subtaskColor = isDark ? '#e4e4e7' : '#3f3f46';
                        if (subtask.done) subtaskColor = mutedColor;

                        return (
                          <Pressable key={subtask.id} onPress={() => toggleSubtask(subtask)} accessibilityRole="button" accessibilityState={{ checked: subtask.done }} className="flex-row items-start py-2 active:opacity-70">
                            <CheckIcon isSelected={subtask.done} isDark={isDark} accent={accent} />
                            <Text className="ml-3 flex-1 text-sm leading-5" style={{ color: subtaskColor, textDecorationLine: subtask.done ? 'line-through' : 'none' }}>
                              {subtask.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}
