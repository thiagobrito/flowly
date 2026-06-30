import { CircleCheck } from 'lucide-react-native';
import { Text, View } from 'react-native';

import type { CompletedStep as CompletedStepData } from '../data';
import NavFooter from './NavFooter';

const ACCENT = '#6366f1';

type CompletedStepProps = {
  step: CompletedStepData;
  isDark: boolean;
  loading?: boolean;
  onFinish: () => void;
};

export default function CompletedStep({ step, isDark, loading, onFinish }: CompletedStepProps) {
  return (
    <View className="flex-1">
      <View className="flex-1 items-center justify-center px-2">
        <View className="size-20 items-center justify-center rounded-full" style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)' }}>
          <CircleCheck size={40} color={ACCENT} strokeWidth={2.2} />
        </View>

        {step.title ? <Text className="mt-6 text-center text-2xl font-bold leading-8 text-zinc-900 dark:text-zinc-50">{step.title}</Text> : null}
        {step.subtitle ? <Text className="mt-3 text-center text-[15px] leading-6 text-zinc-500 dark:text-zinc-400">{step.subtitle}</Text> : null}
      </View>

      <NavFooter label={step.ctaLabel} loading={loading} onPress={onFinish} />
    </View>
  );
}
