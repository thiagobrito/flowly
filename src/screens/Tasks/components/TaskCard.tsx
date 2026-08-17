import { AlignLeft, Check, ChevronDown, ChevronRight, GoalIcon, Pencil, Trash2, TrendingUp, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { toLocalISOString } from '@/lib/date';
import { api } from '@/lib/network';
import { cancelTaskRemindersFor } from '@/lib/taskReminders';
import { ACCENT, energyBorder, energySurface, energyText, mutedText } from '@/lib/theme';

import type { Subtask, Task } from '../../NewTask/data';
import { formatDuration, getLifeArea } from '../../NewTask/data';
import LevelDots from './LevelDots';
import { energyChipLabel, startTimeLabel, taskEnergyBand } from './taskCardMeta';

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

  let borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(28,27,24,0.07)';
  let backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,253,249,0.9)';

  if (highlight) {
    borderColor = ACCENT;
  }

  if (isSelected) {
    borderColor = accent;
    backgroundColor = `${accent}14`;
  }

  const mutedColor = mutedText(isDark);
  const energyLevel = task.energy || 0;
  const energyBand = taskEnergyBand(energyLevel);
  const startTime = startTimeLabel(task);
  const duration = task.estimatedMinutes ? formatDuration(task.estimatedMinutes) : null;

  return (
    <Animated.View className="mb-3" style={animatedStyle}>
      <View className="overflow-hidden rounded-2xl">
        <View className="absolute inset-0 min-h-[122px] w-full flex-row items-stretch justify-between">
          <Animated.View style={[{ width: ACTION_WIDTH }, editStyle]}>
            <Pressable onPress={handleEdit} accessibilityRole="button" accessibilityLabel={`Editar ${task.name}`} className="flex-1 items-center justify-center rounded-l-2xl active:opacity-80" style={{ backgroundColor: ACCENT }}>
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
            {/* Sem papel de botão: o card em si não tem ação — quem age são o
                check, o expandir e as ações de arrastar. Anunciá-lo como botão
                prometeria um toque que não faz nada. */}
            <View className="active:opacity-80">
              <View className="overflow-hidden rounded-2xl" style={{ borderColor, backgroundColor, borderWidth: 1.5 }}>
                <View className="flex-row items-center p-3">
                  {/* Coluna de horário: a primeira coisa que o olho procura numa
                      lista do dia é "quando". Sem bloco agendado o espaço fica
                      vazio — a tarefa existe, só não tem hora marcada. */}
                  <View className="flex flex-col gap-2">
                    {startTime ? (
                      <View className="w-11 items-center">
                        <Text className="text-[12px] font-bold tabular-nums" style={{ color: energyText(energyBand, isDark) }}>
                          {startTime}
                        </Text>
                        {duration ? (
                          <Text className="text-left text-[8px] tabular-nums" style={{ color: mutedColor }}>
                            {duration}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}

                    <View className="size-11 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}22` }}>
                      {AreaIcon ? <AreaIcon size={20} color={accent} /> : <GoalIcon size={20} color={energyText('high', isDark)} />}
                    </View>
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{task.name}</Text>

                    <View className="mt-1.5 flex-row flex-wrap items-center" style={{ gap: 6 }}>
                      <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${accent}22` }}>
                        <Text className="text-[11px] font-semibold" style={{ color: accent }}>
                          {area?.label.toUpperCase() || task.goal.name.toUpperCase()}
                        </Text>
                      </View>

                      {/* Chip no lugar dos cinco dots: quem já usa o app lê a
                          escala 1–5, quem está decidindo instalar lê a palavra. */}
                      <View className="flex-row items-center rounded-full border px-2 py-0.5" style={{ backgroundColor: energySurface(energyBand, isDark), borderColor: energyBorder(energyBand, isDark) }}>
                        <Zap size={11} color={energyText(energyBand, isDark)} />
                        <Text className="ml-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">{energyChipLabel(energyLevel)}</Text>
                      </View>
                    </View>

                    <View className="mt-2 flex-row items-center">
                      <TrendingUp size={13} color={mutedColor} style={{ marginRight: 6 }} />
                      <LevelDots value={task.impact || 0} accent={ACCENT} isDark={isDark} />
                    </View>
                  </View>

                  <Pressable onPress={handlePress} accessibilityRole="button" accessibilityLabel={isSelected ? `Desfazer ${task.name}` : `Concluir ${task.name}`} accessibilityState={{ selected: isSelected }} className="active:opacity-80">
                    <View className="ml-2 size-6 items-center justify-center">
                      <CheckIcon isSelected={isSelected} isDark={isDark} accent={accent} />
                    </View>
                  </Pressable>

                  {canExpand ? (
                    <Pressable onPress={() => setExpanded((prev) => !prev)} accessibilityRole="button" accessibilityLabel="Mostrar detalhes" accessibilityState={{ expanded }} className="ml-1 flex-row items-center rounded-full p-1 active:opacity-70">
                      {hasSubtasks ? (
                        <Text className="text-[11px] font-semibold" style={{ color: mutedColor }}>
                          {doneCount}/{localSubtasks.length}
                        </Text>
                      ) : (
                        <AlignLeft size={13} color={mutedColor} />
                      )}
                      {expanded ? <ChevronDown size={18} color={mutedColor} /> : <ChevronRight size={18} color={mutedColor} />}
                    </Pressable>
                  ) : null}
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
                          <Pressable
                            key={subtask.id}
                            onPress={() => toggleSubtask(subtask)}
                            accessibilityRole="button"
                            accessibilityLabel={subtask.name}
                            accessibilityState={{ checked: subtask.done }}
                            className="flex-row items-start py-2 active:opacity-70"
                          >
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
