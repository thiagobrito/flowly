import { Text, View } from 'react-native';

import { ACCENT, accentTint } from '@/lib/theme';

import type { IntroStep as IntroStepData } from '../data';
import { resolveIcon } from './icons';
import NavFooter from './NavFooter';
import StepShell from './StepShell';

type IntroStepProps = {
  step: IntroStepData;
  isDark: boolean;
  onNext: () => void;
};

export default function IntroStep({ step, isDark, onNext }: IntroStepProps) {
  return (
    <StepShell icon={step.icon} title={step.title} subtitle={step.subtitle} isDark={isDark}>
      <View className="gap-3">
        {step.highlights.map((item) => {
          const Icon = resolveIcon(item.icon);
          return (
            <View key={item.title} className="flex-row items-center rounded-2xl border p-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)' }}>
              <View className="size-11 items-center justify-center rounded-xl" style={{ backgroundColor: isDark ? accentTint(0.18) : accentTint(0.12) }}>
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

      <NavFooter label={step.ctaLabel} onPress={onNext} />
    </StepShell>
  );
}
