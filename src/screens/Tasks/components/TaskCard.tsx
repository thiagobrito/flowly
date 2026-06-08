import { Check, TrendingUp, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Task } from '../../NewTask/data';
import { describeFrequency, getFrequencyMeta, getLifeArea } from '../../NewTask/data';
import LevelDots from './LevelDots';

type CheckIconProps = {
  isSelected: boolean;
  isDark: boolean;
  accent: string;
};

function CheckIcon({ isSelected, isDark, accent }: CheckIconProps) {
  if (isSelected) {
    return (
      <View className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: accent }}>
        <Check size={14} color="#ffffff" />
      </View>
    );
  }
  return (
    <View
      className="h-5 w-5 rounded-full border"
      style={{
        borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)',
      }}
    />
  );
}

type TaskCardProps = {
  task: Task;
  selected: boolean;
  isDark: boolean;
  onPress: () => void;
};

export default function TaskCard({ task, selected, isDark, onPress }: TaskCardProps) {
  const [isSelected, setIsSelected] = useState(selected);
  const area = getLifeArea(task.area);
  const accent = area?.accent ?? '#71717a';
  const AreaIcon = area?.Icon;
  const freqMeta = getFrequencyMeta(task.frequency.kind);
  const FreqIcon = freqMeta?.Icon;

  const handlePress = () => {
    setIsSelected(!isSelected);
    onPress();
  };

  let borderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)';
  let backgroundColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)';

  if (isSelected) {
    borderColor = accent;
    backgroundColor = `${accent}14`;
  }
  const mutedColor = isDark ? '#a1a1aa' : '#71717a';

  return (
    <Pressable onPress={handlePress} accessibilityRole="button" accessibilityState={{ selected: isSelected }} className="mb-3 active:opacity-80">
      <View className="flex-row items-center overflow-hidden rounded-2xl p-3" style={{ borderColor, backgroundColor, borderWidth: 1.5 }}>
        <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accent}22` }}>
          {AreaIcon ? <AreaIcon size={20} color={accent} /> : null}
        </View>

        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-50" numberOfLines={1}>
            {task.name}
          </Text>

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

        <View className="ml-2 h-6 w-6 items-center justify-center">
          <CheckIcon isSelected={isSelected} isDark={isDark} accent={accent} />
        </View>
      </View>
    </Pressable>
  );
}
