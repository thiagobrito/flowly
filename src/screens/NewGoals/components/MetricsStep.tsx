import { Plus, Trash2 } from 'lucide-react-native';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { GoalSetupMetric } from '@/screens/Goals/data';
import { nextMetricDirection } from '@/screens/Goals/data';

import { createEmptyMetric } from '../data';

type MetricsStepProps = {
  value: GoalSetupMetric[];
  isDark: boolean;
  onChange: (metrics: GoalSetupMetric[]) => void;
};

function inputStyle(isDark: boolean) {
  return {
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)',
  };
}

function NumberField({ label, value, isDark, onChange }: { label: string; value: number; isDark: boolean; onChange: (value: number) => void }) {
  return (
    <View className="flex-1">
      <Text className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</Text>
      <TextInput
        value={String(value)}
        onChangeText={(text) => {
          const numeric = Number(text.replace(/[^0-9.]/g, ''));
          onChange(Number.isNaN(numeric) ? 0 : numeric);
        }}
        keyboardType="numeric"
        selectTextOnFocus
        className="rounded-xl border px-3 py-2.5 text-[15px] text-zinc-900 dark:text-zinc-50"
        style={inputStyle(isDark)}
      />
    </View>
  );
}

export default function MetricsStep({ value, isDark, onChange }: MetricsStepProps) {
  const placeholderColor = isDark ? '#71717a' : '#a1a1aa';

  const update = (id: string, patch: Partial<GoalSetupMetric>) =>
    onChange(
      value.map((metric) => {
        if (metric.id !== id) return metric;
        const next = { ...metric, ...patch };
        return { ...next, direction: nextMetricDirection(metric, patch) };
      }),
    );
  const add = () => onChange([...value, createEmptyMetric()]);
  const remove = (id: string) => onChange(value.filter((metric) => metric.id !== id));

  return (
    <View>
      <View className="gap-3">
        {value.map((metric, index) => (
          <View key={metric.id} className="rounded-2xl border p-3" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.6)' }}>
            <View className="flex-row items-center gap-2">
              <TextInput
                value={metric.label}
                onChangeText={(label) => update(metric.id, { label })}
                placeholder={`Métrica ${index + 1} (ex.: Projetos entregues)`}
                placeholderTextColor={placeholderColor}
                className="flex-1 rounded-xl border px-3 py-2.5 text-[15px] text-zinc-900 dark:text-zinc-50"
                style={inputStyle(isDark)}
              />
              <Pressable
                onPress={() => remove(metric.id)}
                accessibilityRole="button"
                accessibilityLabel="Remover métrica"
                className="size-9 items-center justify-center rounded-full active:opacity-70"
                style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)' }}
              >
                <Trash2 size={15} color="#ef4444" />
              </Pressable>
            </View>
            <View className="mt-2.5 flex-row gap-3">
              <NumberField label="Valor atual" value={metric.current} isDark={isDark} onChange={(current) => update(metric.id, { current })} />
              <NumberField label="Alvo" value={metric.target} isDark={isDark} onChange={(target) => update(metric.id, { target })} />
            </View>
          </View>
        ))}
      </View>

      <Pressable
        onPress={add}
        accessibilityRole="button"
        className="mt-3 flex-row items-center justify-center rounded-2xl border px-4 py-3 active:opacity-80"
        style={{ borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)' }}
      >
        <Plus size={16} color={isDark ? '#e4e4e7' : '#3f3f46'} />
        <Text className="ml-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">Adicionar métrica</Text>
      </Pressable>
    </View>
  );
}
