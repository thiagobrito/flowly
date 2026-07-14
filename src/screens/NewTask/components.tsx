import type { LucideIcon } from 'lucide-react-native';
import { Check, Minus, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { Subtask } from './data';
import { formatDuration, LEVEL_LABELS, WEEKDAYS } from './data';

const LEVELS = [1, 2, 3, 4, 5] as const;

function SubtaskCheckIcon({ done, isDark, accent }: { done: boolean; isDark: boolean; accent: string }) {
  if (done) {
    return (
      <View className="size-5 items-center justify-center rounded-full" style={{ backgroundColor: accent }}>
        <Check size={12} color="#ffffff" />
      </View>
    );
  }

  return (
    <View
      className="size-4 rounded-full border"
      style={{
        borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)',
      }}
    />
  );
}

type LevelScaleProps = {
  value: number;
  onChange: (value: number) => void;
  Icon: LucideIcon;
  accent: string;
  isDark: boolean;
};

function firstLetterToUpperCase(text: string | number | null | undefined): string {
  const normalized = String(text ?? '');
  if (!normalized) return '';

  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

export function LevelScale({ value, onChange, Icon, accent, isDark }: LevelScaleProps) {
  const safeValue = Number.isFinite(Number(value)) ? Math.max(1, Math.min(5, Number(value))) : 3;
  const label = LEVEL_LABELS[safeValue - 1];
  const emptyBarColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  return (
    <View>
      <View className="flex-row items-center">
        <Icon size={18} color={accent} style={{ marginRight: 10 }} />
        <View className="flex-1 flex-row items-center">
          {LEVELS.map((level) => {
            const isFilled = level <= safeValue;
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
        <Text className="w-5 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-200" style={{ marginLeft: 10 }}>
          {safeValue}
        </Text>
      </View>
      <Text className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{label}</Text>
    </View>
  );
}

type OptionChipProps = {
  label: string;
  isGoal?: boolean;
  Icon?: LucideIcon;
  selected: boolean;
  accent?: string;
  isDark: boolean;
  onPress: () => void;
  className?: string;
};

export function OptionChip({ label, isGoal, Icon, selected, accent = '#3b82f6', isDark, onPress, className = '' }: OptionChipProps) {
  let iconColor = isDark ? '#a1a1aa' : '#71717a';
  let borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  let backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)';
  let textColor = isDark ? '#e4e4e7' : '#3f3f46';
  const goalBorderColor = isGoal ? '#22c55e' : (null as string | null);

  if (selected) {
    iconColor = accent;
    borderColor = accent;
    backgroundColor = `${accent}18`;
    textColor = accent;
  }

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} className={`active:opacity-80 ${className}`}>
      <View
        className="w-full flex-row items-center justify-center rounded-2xl p-3"
        style={{
          borderColor,
          backgroundColor,
          borderWidth: 1,
          ...(goalBorderColor ? { borderColor: goalBorderColor } : {}),
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
          {firstLetterToUpperCase(label)}
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
          <Pressable key={option.value} onPress={() => onChange(option.value)} accessibilityRole="button" accessibilityState={{ selected }} className="flex-1 active:opacity-80">
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
      <Pressable onPress={decrement} disabled={value <= min} accessibilityRole="button" accessibilityLabel="Diminuir" className="active:opacity-70">
        <View className="size-10 items-center justify-center rounded-full" style={{ backgroundColor: buttonBg, opacity: value <= min ? 0.4 : 1 }}>
          <Minus size={18} color={isDark ? '#e4e4e7' : '#3f3f46'} />
        </View>
      </Pressable>

      <View className="items-center">
        <Text className="text-2xl font-bold" style={{ color: accent }}>
          {value}
        </Text>
        {suffix ? <Text className="text-sm text-zinc-500 dark:text-zinc-400">{suffix}</Text> : null}
      </View>

      <Pressable onPress={increment} disabled={value >= max} accessibilityRole="button" accessibilityLabel="Aumentar" className="active:opacity-70">
        <View className="size-10 items-center justify-center rounded-full" style={{ backgroundColor: buttonBg, opacity: value >= max ? 0.4 : 1 }}>
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
          <Pressable key={day.index} onPress={() => toggleDay(day.index)} accessibilityRole="button" accessibilityState={{ selected }} className="active:opacity-80">
            <View
              className="size-10 items-center justify-center rounded-full border"
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

type EstimatedTimePickerProps = {
  value: number | null;
  onChange: (minutes: number | null) => void;
  accent: string;
  isDark: boolean;
};

const MINUTE_PRESETS = [5, 10, 15, 30, 45] as const;
const HOUR_PRESETS = [1, 1.5, 2, 3, 4] as const;

export function EstimatedTimePicker({ value, onChange, accent, isDark }: EstimatedTimePickerProps) {
  const [unit, setUnit] = useState<'min' | 'h'>(value && value >= 60 ? 'h' : 'min');

  const presets = unit === 'min' ? MINUTE_PRESETS : HOUR_PRESETS;
  const presetToMinutes = (preset: number) => (unit === 'min' ? preset : Math.round(preset * 60));
  const presetLabel = (preset: number) => {
    if (unit === 'min') return `${preset}min`;
    return preset % 1 === 0 ? `${preset}h` : `${preset}h30`;
  };

  const emptyBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const emptyBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)';
  const emptyText = isDark ? '#a1a1aa' : '#71717a';

  const handleSelect = (minutes: number) => {
    onChange(value === minutes ? null : minutes);
  };

  return (
    <View>
      <SegmentedToggle
        options={[
          { value: 'min', label: 'Minutos' },
          { value: 'h', label: 'Horas' },
        ]}
        value={unit}
        onChange={(next) => setUnit(next as 'min' | 'h')}
        accent={accent}
        isDark={isDark}
      />

      <View className="-mx-1 mt-3 flex-row flex-wrap">
        {presets.map((preset) => {
          const minutes = presetToMinutes(preset);
          const selected = value === minutes;

          return (
            <View key={preset} className="p-1">
              <Pressable onPress={() => handleSelect(minutes)} accessibilityRole="button" accessibilityState={{ selected }} className="active:opacity-80">
                <View
                  className="rounded-full px-4 py-2"
                  style={{
                    borderWidth: 1,
                    borderColor: selected ? accent : emptyBorder,
                    backgroundColor: selected ? `${accent}18` : emptyBg,
                  }}
                >
                  <Text className="text-sm font-semibold" style={{ color: selected ? accent : emptyText }}>
                    {presetLabel(preset)}
                  </Text>
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View
        className="mt-3 flex-row items-center justify-between rounded-2xl px-4 py-3"
        style={{
          borderWidth: 1,
          borderColor: value ? accent : emptyBorder,
          backgroundColor: value ? `${accent}12` : emptyBg,
        }}
      >
        <Text className="text-base font-semibold" style={{ color: value ? accent : emptyText }}>
          {formatDuration(value)}
        </Text>
        {value ? (
          <Pressable onPress={() => onChange(null)} accessibilityRole="button" accessibilityLabel="Limpar estimativa" className="active:opacity-70">
            <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Limpar</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

type SubtaskEditorProps = {
  value: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
  accent: string;
  isDark: boolean;
  /** Quando presente, cada linha fica tocável para alternar concluída. */
  onToggle?: (subtask: Subtask) => void;
};

export function SubtaskEditor({ value, onChange, accent, isDark, onToggle }: SubtaskEditorProps) {
  const [draft, setDraft] = useState('');

  const addSubtask = () => {
    const name = draft.trim();
    if (!name) return;
    const subtask: Subtask = { id: Math.random().toString(36).substring(2, 15), name, done: false };
    onChange([...value, subtask]);
    setDraft('');
  };

  const removeSubtask = (id: string) => {
    onChange(value.filter((item) => item.id !== id));
  };

  const hasDraft = draft.trim().length > 0;
  let buttonBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  let iconColor = isDark ? '#71717a' : '#a1a1aa';
  if (hasDraft) {
    buttonBg = accent;
    iconColor = '#ffffff';
  }

  return (
    <View>
      <View className="flex-row items-center">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addSubtask}
          returnKeyType="done"
          blurOnSubmit={false}
          placeholder="Ex: Comprar leite"
          placeholderTextColor={isDark ? '#71717a' : '#a1a1aa'}
          className="flex-1 rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-50"
        />
        <Pressable onPress={addSubtask} disabled={draft.trim().length === 0} accessibilityRole="button" accessibilityLabel="Adicionar sub-tarefa" className="ml-2 active:opacity-80">
          <View className="size-12 items-center justify-center rounded-2xl" style={{ backgroundColor: buttonBg }}>
            <Plus size={20} color={iconColor} />
          </View>
        </Pressable>
      </View>

      {value.map((item) => {
        let textColor = isDark ? '#e4e4e7' : '#3f3f46';
        if (item.done && onToggle) textColor = isDark ? '#a1a1aa' : '#71717a';

        const rowContent = (
          <>
            {onToggle ? <SubtaskCheckIcon done={item.done} isDark={isDark} accent={accent} /> : null}
            <Text className={`flex-1 text-base leading-5 ${onToggle ? 'ml-3' : ''} text-zinc-800 dark:text-zinc-100`} style={onToggle ? { color: textColor, textDecorationLine: item.done ? 'line-through' : 'none' } : undefined}>
              {item.name}
            </Text>
            <Pressable onPress={() => removeSubtask(item.id)} accessibilityRole="button" accessibilityLabel={`Remover ${item.name}`} className="ml-3 active:opacity-70" hitSlop={8}>
              <Trash2 size={18} color="#ef4444" />
            </Pressable>
          </>
        );

        const rowStyle = {
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
        };

        if (onToggle) {
          return (
            <Pressable key={item.id} onPress={() => onToggle(item)} accessibilityRole="button" accessibilityState={{ checked: item.done }} className="mt-2 flex-row items-start rounded-2xl border px-4 py-3 active:opacity-70" style={rowStyle}>
              {rowContent}
            </Pressable>
          );
        }

        return (
          <View key={item.id} className="mt-2 flex-row items-start justify-between rounded-2xl border px-4 py-3" style={rowStyle}>
            {rowContent}
          </View>
        );
      })}
    </View>
  );
}
