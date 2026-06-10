import { Check, Pencil, Trash2, TrendingUp, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { api } from '@/lib/network';

import type { Task } from '../../NewTask/data';
import { describeFrequency, getFrequencyMeta, getLifeArea } from '../../NewTask/data';
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
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const area = getLifeArea(task.area);
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
        await api.post('/tasks/undo', { taskId: task.id, date: new Date().toISOString() });
      } else {
        await api.post('/tasks/complete', { taskId: task.id, date: new Date().toISOString() });
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
              <View className="flex-row items-center overflow-hidden rounded-2xl p-3" style={{ borderColor, backgroundColor, borderWidth: 1.5 }}>
                <View className="size-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accent}22` }}>
                  {AreaIcon ? <AreaIcon size={20} color={accent} /> : null}
                </View>

                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{task.name}</Text>

                  <View className="mt-1.5 flex-row items-center">
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${accent}22`, marginRight: 8 }}>
                      <Text className="text-xs font-semibold" style={{ color: accent }}>
                        {area?.label}
                      </Text>
                    </View>

                    <View className="flex-1 flex-row items-center">
                      {FreqIcon ? <FreqIcon size={13} color={mutedColor} style={{ marginRight: 5 }} /> : null}
                      <Text className="flex-1 text-xs font-medium" style={{ color: mutedColor }} numberOfLines={1}>
                        {describeFrequency(task.frequency)}
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
                  </View>
                </View>

                <Pressable onPress={handlePress} accessibilityRole="button" accessibilityState={{ selected: isSelected }} className="active:opacity-80">
                  <View className="ml-2 size-6 items-center justify-center">
                    <CheckIcon isSelected={isSelected} isDark={isDark} accent={accent} />
                  </View>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}
