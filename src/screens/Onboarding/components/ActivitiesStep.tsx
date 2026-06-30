import { Check, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { ActivitiesStep as ActivitiesStepData } from '../data';
import { resolveIcon } from './icons';
import NavFooter from './NavFooter';
import StepShell from './StepShell';

const ACCENT = '#6366f1';

export type OnboardingActivity = { id: string; name: string };

type ActivitiesStepProps = {
  step: ActivitiesStepData;
  isDark: boolean;
  goalName?: string | null;
  activities: OnboardingActivity[];
  onAddActivity: () => void;
  onNext: () => void;
};

export default function ActivitiesStep({ step, isDark, goalName, activities, onAddActivity, onNext }: ActivitiesStepProps) {
  return (
    <StepShell icon={step.icon} title={step.title} subtitle={step.subtitle} isDark={isDark}>
      {goalName ? (
        <View className="mb-4 self-start rounded-full px-3 py-1.5" style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)' }}>
          <Text className="text-xs font-semibold" style={{ color: ACCENT }}>
            Objetivo: {goalName}
          </Text>
        </View>
      ) : null}

      {activities.length === 0 ? (
        <View className="gap-3">
          {step.highlights.map((item) => {
            const Icon = resolveIcon(item.icon);
            return (
              <View
                key={item.title}
                className="flex-row items-center rounded-2xl border p-4"
                style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)' }}
              >
                <View className="size-11 items-center justify-center rounded-xl" style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)' }}>
                  <Icon size={20} color={ACCENT} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">{item.title}</Text>
                  <Text className="mt-0.5 text-sm leading-5 text-zinc-500 dark:text-zinc-400">{item.description}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View className="gap-2">
          {activities.map((activity) => (
            <View
              key={activity.id}
              className="flex-row items-center rounded-2xl border p-3.5"
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)' }}
            >
              <View className="size-8 items-center justify-center rounded-full" style={{ backgroundColor: isDark ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.12)' }}>
                <Check size={16} color="#22c55e" strokeWidth={2.6} />
              </View>
              <Text className="ml-3 flex-1 text-[15px] text-zinc-800 dark:text-zinc-100">{activity.name}</Text>
            </View>
          ))}
        </View>
      )}

      <Pressable
        onPress={onAddActivity}
        accessibilityRole="button"
        className="mt-3 flex-row items-center justify-center rounded-2xl border border-dashed py-4 active:opacity-70"
        style={{ borderColor: ACCENT, backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)' }}
      >
        <Plus size={18} color={ACCENT} strokeWidth={2.6} />
        <Text className="ml-2 text-[15px] font-semibold" style={{ color: ACCENT }}>
          {step.addLabel}
        </Text>
      </Pressable>

      <NavFooter label={step.ctaLabel} enabled={activities.length > 0} skipLabel={activities.length === 0 ? step.skipLabel : undefined} onPress={onNext} onSkip={onNext} />
    </StepShell>
  );
}
