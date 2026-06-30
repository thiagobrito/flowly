import { Quote } from 'lucide-react-native';
import { Text, View } from 'react-native';

import type { QuoteStep as QuoteStepData } from '../data';
import NavFooter from './NavFooter';

const ACCENT = '#6366f1';

type QuoteStepProps = {
  step: QuoteStepData;
  isDark: boolean;
  onNext: () => void;
};

export default function QuoteStep({ step, isDark, onNext }: QuoteStepProps) {
  return (
    <View className="flex-1">
      <View className="flex-1 items-center justify-center px-2">
        <View className="size-14 items-center justify-center rounded-2xl" style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)' }}>
          <Quote size={26} color={ACCENT} strokeWidth={2.2} />
        </View>

        <Text className="mt-6 text-center text-2xl font-semibold leading-9 text-zinc-900 dark:text-zinc-50">{step.quote}</Text>

        {step.author ? <Text className="mt-4 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">— {step.author}</Text> : null}
      </View>

      <NavFooter label={step.ctaLabel} onPress={onNext} />
    </View>
  );
}
