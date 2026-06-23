import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import type { AnamnesisStep } from '../data';
import { resolveIcon } from './icons';

const ACCENT = '#6366f1';

type StepShellProps = {
  step: AnamnesisStep;
  isDark: boolean;
  children?: ReactNode;
};

export default function StepShell({ step, isDark, children }: StepShellProps) {
  const Icon = resolveIcon(step.icon);

  return (
    <View className="flex-1">
      <View className="mt-2 size-14 items-center justify-center rounded-2xl" style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)' }}>
        <Icon size={26} color={ACCENT} strokeWidth={2.2} />
      </View>

      <Text className="mt-5 text-2xl font-bold leading-8 text-zinc-900 dark:text-zinc-50">{step.title}</Text>
      {step.subtitle ? <Text className="mt-2 text-[15px] leading-6 text-zinc-500 dark:text-zinc-400">{step.subtitle}</Text> : null}

      <View className="mt-6 flex-1">{children}</View>
    </View>
  );
}
