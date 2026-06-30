import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';

import type { PaymentStep as PaymentStepData } from '../data';
import NavFooter from './NavFooter';
import StepShell from './StepShell';

const ACCENT = '#6366f1';

type PaymentStepProps = {
  step: PaymentStepData;
  isDark: boolean;
  onOpenPaywall: () => void;
  onSkip: () => void;
};

export default function PaymentStep({ step, isDark, onOpenPaywall, onSkip }: PaymentStepProps) {
  return (
    <StepShell icon={step.icon} title={step.title} subtitle={step.subtitle} isDark={isDark}>
      <View className="gap-3">
        {step.benefits.map((benefit) => (
          <View key={benefit} className="flex-row items-center rounded-2xl border p-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)' }}>
            <View className="size-9 items-center justify-center rounded-full" style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)' }}>
              <Check size={18} color={ACCENT} strokeWidth={2.6} />
            </View>
            <Text className="ml-3 flex-1 text-[15px] leading-5 text-zinc-700 dark:text-zinc-200">{benefit}</Text>
          </View>
        ))}
      </View>

      <Text className="mt-5 text-center text-base font-semibold" style={{ color: ACCENT }}>
        {step.priceLabel}
      </Text>
      {step.footnote ? <Text className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">{step.footnote}</Text> : null}

      <NavFooter label={step.ctaLabel} skipLabel={step.skipLabel} onPress={onOpenPaywall} onSkip={onSkip} />
    </StepShell>
  );
}
