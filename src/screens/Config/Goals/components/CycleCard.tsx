import { Star } from 'lucide-react-native';
import { Text, View } from 'react-native';

import type { Goal } from '../data';
import ProgressBar from './ProgressBar';

type CycleCardProps = {
  currentWeek: number;
  totalWeeks: number;
  mainGoal: Goal;
  secondaryGoals: Goal[];
  isDark: boolean;
};

function SecondaryGoalRow({ goal, label, description, isDark, showDivider, points }: { goal: Goal; label: string; description: string; isDark: boolean; showDivider: boolean; points: number }) {
  return (
    <View className="py-3" style={showDivider ? { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' } : undefined}>
      <View className="flex-row items-center justify-between">
        <View className="flex flex-row">
          <Text className="text-[15px] font-medium text-zinc-900 dark:text-zinc-50">{goal.name}</Text>
          <Text className="ml-2 self-center text-center text-xs font-semibold uppercase text-gray-400 text-zinc-900 dark:text-zinc-50">({label})</Text>
        </View>
        <Text className="text-sm font-semibold text-blue-600">{points} pontos</Text>
      </View>

      <Text className="mt-1 leading-6 text-zinc-500">{description}</Text>
    </View>
  );
}

export default function CycleCard({ currentWeek, totalWeeks, mainGoal, secondaryGoals, isDark }: CycleCardProps) {
  const cycleProgress = (currentWeek / totalWeeks) * 100;

  return (
    <View
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.25)',
        backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)',
      }}
    >
      {/* Progresso do ciclo */}
      <View className="p-4">
        <View className="flex-row items-baseline justify-between">
          <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Ciclo Atual</Text>
          <Text className="text-sm font-semibold" style={{ color: '#6366f1' }}>
            Semana {currentWeek} de {totalWeeks}
          </Text>
        </View>
        <View className="mt-3">
          <ProgressBar progress={cycleProgress} isDark={isDark} />
        </View>
      </View>

      {/* Meta principal */}
      <View className="mx-4 mb-4 rounded-xl border p-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.85)' }}>
        <View className="flex-row items-center">
          <Star size={15} color="#f59e0b" fill="#f59e0b" />
          <Text className="ml-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Meta Principal</Text>
        </View>

        <View className="mt-2 flex-row items-center items-baseline justify-between">
          <View className="my-auto flex flex-col">
            <Text className="text-sm uppercase text-zinc-500">{mainGoal.label.toUpperCase()}</Text>
            <Text className="flex-1 pr-3 text-lg font-bold text-zinc-900 dark:text-zinc-50" numberOfLines={1}>
              {mainGoal.name}
            </Text>
          </View>
          <Text className="my-auto flex self-center text-xl font-semibold" style={{ color: '#6366f1' }}>
            {mainGoal.points} pontos
          </Text>
        </View>

        {/* <View className="mt-2.5">
          <ProgressBar progress={mainGoal.progress} isDark={isDark} height={8} />
        </View> */}

        {/* mainGoal.currentValue && mainGoal.targetValue ? (
          <Text className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {mainGoal.currentValue} <Text className="text-zinc-400 dark:text-zinc-500">→</Text> {mainGoal.targetValue}
          </Text>
        ) : null */}

        <Text className="mt-3 text-base leading-6 text-zinc-700 dark:text-zinc-300">{mainGoal.description}</Text>

        {/* <Pressable onPress={() => onViewGoal(mainGoal)} accessibilityRole="button" className="mt-3.5 items-center rounded-xl py-2.5 active:opacity-85" style={{ backgroundColor: '#6366f1' }}>
          <Text className="text-sm font-semibold text-white">Ver Meta</Text>
        </Pressable>
        */}
      </View>

      {secondaryGoals.length > 0 ? (
        <View className="px-4 pb-3" style={{ borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
          <Text className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Metas Secundárias</Text>
          {secondaryGoals.map((goal, index, list) => (
            <SecondaryGoalRow key={goal.id} goal={goal} label={goal.label} description={goal.description} points={goal.points} isDark={isDark} showDivider={index < list.length - 1} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
