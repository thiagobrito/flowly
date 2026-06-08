import type { LucideIcon } from 'lucide-react-native';
import { Minus, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { LEVEL_LABELS, WEEKDAYS } from './data';

const LEVELS = [1, 2, 3, 4, 5] as const;

type LevelScaleProps = {
  value: number;
  onChange: (value: number) => void;
  Icon: LucideIcon;
  accent: string;
  isDark: boolean;
};

export function LevelScale({ value, onChange, Icon, accent, isDark }: LevelScaleProps) {
  const label = LEVEL_LABELS[Math.max(0, Math.min(4, value - 1))];
  const emptyBarColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  return (
    <View>
      <View className="flex-row items-center">
        <Icon size={18} color={accent} style={{ marginRight: 10 }} />
        <View className="flex-1 flex-row items-center">
          {LEVELS.map((level) => {
            const isFilled = level <= value;
            const isLast = level === LEVELS.length;

            return (
              <Pressable
                key={level}
                onPress={() => onChange(level)}
                accessibilityRole="button"
                accessibilityLabel={`Nível ${level} de 5`}
                accessibilityState={{ selected: isFilled }}
                className="flex-1 active:opacity-70"
                style={{ marginRight: isLast ? 0 : 6 }}
              >
                <View
                  className="h-3 rounded-full"
                  style={{
                    backgroundColor: isFilled ? accent : emptyBarColor,
                  }}
                />
              </Pressable>
            );
          })}
        </View>
        <Text
          className="w-5 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-200"
          style={{ marginLeft: 10 }}
        >
          {value}
        </Text>
      </View>
      <Text className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{label}</Text>
    </View>
  );
}

type OptionChipProps = {
  label: string;
  Icon?: LucideIcon;
  selected: boolean;
  accent?: string;
  isDark: boolean;
  onPress: () => void;
  className?: string;
};

export function OptionChip({
  label,
  Icon,
  selected,
  accent = '#3b82f6',
  isDark,
  onPress,
  className = '',
}: OptionChipProps) {
  let iconColor = isDark ? '#a1a1aa' : '#71717a';
  let borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  let backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)';
  let textColor = isDark ? '#e4e4e7' : '#3f3f46';

  if (selected) {
    iconColor = accent;
    borderColor = accent;
    backgroundColor = `${accent}18`;
    textColor = accent;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`active:opacity-80 ${className}`}
    >
      <View
        className="w-full flex-row items-center justify-center rounded-2xl border p-3"
        style={{
          borderColor,
          backgroundColor,
        }}
      >
        {Icon ? <Icon size={16} color={iconColor} /> : null}
        <Text
          className="text-sm font-medium"
          style={{
            color: textColor,
            marginLeft: Icon ? 8 : 0,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

type SectionHeaderProps = {
  label: string;
  Icon: LucideIcon;
  accent: string;
};

export function SectionHeader({ label, Icon, accent }: SectionHeaderProps) {
  return (
    <View className="mb-3 flex-row items-center">
      <Icon size={16} color={accent} style={{ marginRight: 8 }} />
      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</Text>
    </View>
  );
}

type SegmentedToggleProps = {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  accent: string;
  isDark: boolean;
};

export function SegmentedToggle({ options, value, onChange, accent, isDark }: SegmentedToggleProps) {
  return (
    <View
      className="flex-row rounded-2xl border p-1"
      style={{
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
      }}
    >
      {options.map((option) => {
        const selected = value === option.value;
        let optionColor = '#71717a';
        if (selected) {
          optionColor = accent;
        } else if (isDark) {
          optionColor = '#a1a1aa';
        }

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className="flex-1 active:opacity-80"
          >
            <View
              className="items-center rounded-xl py-2"
              style={{
                backgroundColor: selected ? `${accent}22` : 'transparent',
              }}
            >
              <Text className="text-sm font-medium" style={{ color: optionColor }}>
                {option.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  accent: string;
  isDark: boolean;
};

export function Stepper({ value, onChange, min = 1, max = 99, suffix, accent, isDark }: StepperProps) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(Math.min(max, value + 1));

  const buttonBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <View className="flex-row items-center justify-between">
      <Pressable
        onPress={decrement}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel="Diminuir"
        className="active:opacity-70"
      >
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: buttonBg, opacity: value <= min ? 0.4 : 1 }}
        >
          <Minus size={18} color={isDark ? '#e4e4e7' : '#3f3f46'} />
        </View>
      </Pressable>

      <View className="items-center">
        <Text className="text-2xl font-bold" style={{ color: accent }}>
          {value}
        </Text>
        {suffix ? <Text className="text-sm text-zinc-500 dark:text-zinc-400">{suffix}</Text> : null}
      </View>

      <Pressable
        onPress={increment}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel="Aumentar"
        className="active:opacity-70"
      >
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: buttonBg, opacity: value >= max ? 0.4 : 1 }}
        >
          <Plus size={18} color={isDark ? '#e4e4e7' : '#3f3f46'} />
        </View>
      </Pressable>
    </View>
  );
}

type WeekdayTogglesProps = {
  value: number[];
  onChange: (days: number[]) => void;
  accent: string;
  isDark: boolean;
};

export function WeekdayToggles({ value, onChange, accent, isDark }: WeekdayTogglesProps) {
  const toggleDay = (dayIndex: number) => {
    if (value.includes(dayIndex)) {
      onChange(value.filter((d) => d !== dayIndex));
      return;
    }
    onChange([...value, dayIndex].sort((a, b) => a - b));
  };

  return (
    <View className="flex-row justify-between">
      {WEEKDAYS.map((day) => {
        const selected = value.includes(day.index);
        let dayBorderColor = 'rgba(0,0,0,0.08)';
        let dayTextColor = '#71717a';
        if (selected) {
          dayBorderColor = accent;
          dayTextColor = accent;
        } else if (isDark) {
          dayBorderColor = 'rgba(255,255,255,0.12)';
          dayTextColor = '#a1a1aa';
        }

        return (
          <Pressable
            key={day.index}
            onPress={() => toggleDay(day.index)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className="active:opacity-80"
          >
            <View
              className="h-10 w-10 items-center justify-center rounded-full border"
              style={{
                borderColor: dayBorderColor,
                backgroundColor: selected ? `${accent}22` : 'transparent',
              }}
            >
              <Text className="text-xs font-semibold" style={{ color: dayTextColor }}>
                {day.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
