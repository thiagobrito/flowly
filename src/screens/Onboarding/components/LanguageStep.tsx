import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { OnboardingLanguage } from '@/lib/onboarding';

import type { LanguageStep as LanguageStepData } from '../data';
import NavFooter from './NavFooter';
import StepShell from './StepShell';

const ACCENT = '#6366f1';

type LanguageStepProps = {
  step: LanguageStepData;
  isDark: boolean;
  language: OnboardingLanguage;
  onSelect: (language: OnboardingLanguage) => void;
  onNext: () => void;
};

export default function LanguageStep({ step, isDark, language, onSelect, onNext }: LanguageStepProps) {
  return (
    <StepShell icon={step.icon} title={step.title} subtitle={step.subtitle} isDark={isDark}>
      <View className="gap-3">
        {step.languages.map((option) => {
          const selected = option.enabled && option.code === language;
          const restingBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
          const selectedBackground = isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.10)';
          const restingBackground = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)';
          return (
            <Pressable
              key={option.code}
              onPress={() => option.enabled && onSelect(option.code)}
              disabled={!option.enabled}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !option.enabled }}
              className="flex-row items-center justify-between rounded-2xl border p-4 active:opacity-80"
              style={{
                borderColor: selected ? ACCENT : restingBorder,
                backgroundColor: selected ? selectedBackground : restingBackground,
                opacity: option.enabled ? 1 : 0.5,
              }}
            >
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">{option.label}</Text>
                {!option.enabled ? <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Em breve</Text> : null}
              </View>
              {selected ? <Check size={20} color={ACCENT} strokeWidth={2.4} /> : null}
            </Pressable>
          );
        })}
      </View>

      <NavFooter label={step.ctaLabel} onPress={onNext} />
    </StepShell>
  );
}
