import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import DisplayText from '@/components/DisplayText';
import { ACCENT, accentOn } from '@/lib/theme';

import { resolveIcon } from './icons';

type StepShellProps = {
  icon?: string;
  title?: string;
  subtitle?: string;
  isDark: boolean;
  children?: ReactNode;
};

/** Casca visual compartilhada dos passos: ícone, título, subtítulo e conteúdo. */
export default function StepShell({ icon, title, subtitle, isDark, children }: StepShellProps) {
  const Icon = resolveIcon(icon);

  return (
    <View className="flex-1">
      <View className="mt-2 size-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${ACCENT}${isDark ? '2e' : '1f'}` }}>
        <Icon size={26} color={accentOn(isDark)} strokeWidth={2.2} />
      </View>

      {title ? (
        <DisplayText weight="bold" className="mt-5 text-2xl leading-8 text-zinc-900 dark:text-zinc-50">
          {title}
        </DisplayText>
      ) : null}
      {subtitle ? <Text className="mt-2 text-[15px] leading-6 text-zinc-500 dark:text-zinc-400">{subtitle}</Text> : null}

      <View className="mt-6 flex-1">{children}</View>
    </View>
  );
}
