import { Minus, Plus } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Pressable, Text, View } from 'react-native';

import { minutesToTimeString, timeStringToMinutes } from '@/lib/sleepProfile';

type TimeStepperProps = {
  label: string;
  Icon?: ComponentType<{ size?: number; color?: string }>;
  /** Horário "HH:MM". */
  value: string;
  onChange: (value: string) => void;
  isDark: boolean;
  /** Incremento dos botões, em minutos. Padrão: 15. */
  stepMinutes?: number;
  accent?: string;
};

/** Seletor de horário com passos de N minutos (usado no onboarding e no SleepCard). */
export default function TimeStepper({ label, Icon, value, onChange, isDark, stepMinutes = 15, accent = '#6366f1' }: TimeStepperProps) {
  const minutes = timeStringToMinutes(value) ?? 7 * 60;

  const step = (delta: number) => {
    onChange(minutesToTimeString(minutes + delta));
  };

  const buttonStyle = {
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.10)',
  } as const;
  const iconColor = isDark ? '#e4e4e7' : accent;

  return (
    <View className="flex-row items-center justify-between rounded-2xl border px-4 py-3" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)' }}>
      <View className="flex-row items-center">
        {Icon ? <Icon size={18} color={iconColor} /> : null}
        <Text className={`${Icon ? 'ml-2 ' : ''}text-[15px] font-medium text-zinc-700 dark:text-zinc-200`}>{label}</Text>
      </View>

      <View className="flex-row items-center" style={{ gap: 10 }}>
        <Pressable onPress={() => step(-stepMinutes)} accessibilityRole="button" accessibilityLabel={`Diminuir ${label}`} hitSlop={6} className="size-9 items-center justify-center rounded-full active:opacity-70" style={buttonStyle}>
          <Minus size={16} color={iconColor} strokeWidth={2.6} />
        </Pressable>

        <Text className="w-14 text-center text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{minutesToTimeString(minutes)}</Text>

        <Pressable onPress={() => step(stepMinutes)} accessibilityRole="button" accessibilityLabel={`Aumentar ${label}`} hitSlop={6} className="size-9 items-center justify-center rounded-full active:opacity-70" style={buttonStyle}>
          <Plus size={16} color={iconColor} strokeWidth={2.6} />
        </Pressable>
      </View>
    </View>
  );
}
