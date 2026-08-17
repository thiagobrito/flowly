/**
 * Linha compacta de uma meta secundária.
 *
 * Secundária não é "menos importante o suficiente para sumir": é o que se
 * consulta, não o que se contempla. A linha entrega nome, onde está no ciclo e
 * quanto andou — e abre o card completo no toque.
 */

import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { accentOn, mutedText, surface } from '@/lib/theme';
import { GetLifeArea } from '@/screens/common';
import ProgressBar from '@/screens/Config/Goals/components/ProgressBar';

import { cycleWeekLabel, type Goal } from '../data';

type GoalRowProps = {
  goal: Goal;
  isDark: boolean;
  expanded: boolean;
  onToggle: () => void;
};

export default function GoalRow({ goal, isDark, expanded, onToggle }: GoalRowProps) {
  const area = GetLifeArea(goal.areaId);
  const accent = area?.accent ?? accentOn(isDark);
  const AreaIcon = area?.Icon;
  const muted = mutedText(isDark);

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={`${goal.name}, ${cycleWeekLabel(goal)}, ${goal.progress} por cento`}
      accessibilityState={{ expanded }}
      className="flex-row items-center rounded-2xl border px-4 py-3 active:opacity-80"
      style={{ borderColor: surface.border(isDark), backgroundColor: surface.card(isDark) }}
    >
      <View className="size-9 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}22` }}>
        {AreaIcon ? <AreaIcon size={17} color={accent} /> : null}
      </View>

      <View className="ml-3 flex-1">
        <Text numberOfLines={1} className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
          {goal.name}
        </Text>

        <View className="mt-1 flex-row items-center">
          <Text className="text-[11px]" style={{ color: muted }}>
            {cycleWeekLabel(goal)}
          </Text>
          <Text className="ml-auto text-[11px] font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">{goal.progress}%</Text>
        </View>

        <View className="mt-1.5">
          <ProgressBar progress={goal.progress} isDark={isDark} color={accent} height={4} />
        </View>
      </View>

      <View className="ml-3">{expanded ? <ChevronDown size={18} color={muted} /> : <ChevronRight size={18} color={muted} />}</View>
    </Pressable>
  );
}
