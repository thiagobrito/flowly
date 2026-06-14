import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, CalendarCheck, Info } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

import SettingsToggle from '../../components/SettingsToggle';
import { formatDate, parseIsoDate, toIsoDate } from '../dateUtils';

type CycleDatesCardProps = {
  startDate: string;
  endDate: string;
  freeDates: boolean;
  isDark: boolean;
  onChangeStart: (iso: string) => void;
  onChangeEnd: (iso: string) => void;
  onToggleFreeDates: (value: boolean) => void;
};

type PickerTarget = 'start' | 'end' | null;

const ACCENT = '#6366f1';

function borderColorForField(disabled: boolean | undefined, isDark: boolean): string {
  if (!disabled) return ACCENT;
  return isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
}

function iconColorForField(disabled: boolean | undefined, isDark: boolean): string {
  if (!disabled) return ACCENT;
  return isDark ? '#a1a1aa' : '#71717a';
}

function DateField({ label, value, Icon, disabled, isDark, onPress }: { label: string; value: string; Icon: typeof Calendar; disabled?: boolean; isDark: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} className="flex-1 active:opacity-80" style={{ minWidth: 0, opacity: disabled ? 0.6 : 1 }}>
      <View
        className="rounded-2xl border p-3"
        style={{
          borderColor: borderColorForField(disabled, isDark),
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
        }}
      >
        <View className="flex-row items-center gap-2">
          <Icon size={16} color={iconColorForField(disabled, isDark)} />
          <View className="min-w-0 flex-1">
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">{label}</Text>
            <Text className="text-sm font-medium" style={{ color: isDark ? '#fafafa' : '#18181b' }} numberOfLines={1} ellipsizeMode="tail">
              {formatDate(value)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function CycleDatesCard({ startDate, endDate, freeDates, isDark, onChangeStart, onChangeEnd, onToggleFreeDates }: CycleDatesCardProps) {
  const [target, setTarget] = useState<PickerTarget>(null);

  const pickerValue = useMemo(() => parseIsoDate(target === 'end' ? endDate : startDate), [target, startDate, endDate]);

  const applyDate = (selectedDate: Date) => {
    const iso = toIsoDate(selectedDate);
    if (target === 'start') onChangeStart(iso);
    else if (target === 'end') onChangeEnd(iso);
  };

  const handlePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setTarget(null);
      if (event.type === 'set' && selectedDate) applyDate(selectedDate);
      return;
    }
    if (selectedDate) applyDate(selectedDate);
  };

  return (
    <View
      className="rounded-2xl border p-4"
      style={{
        borderColor: isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.25)',
        backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)',
      }}
    >
      <View className="flex-row">
        <View className="min-w-0 flex-1" style={{ marginRight: 6 }}>
          <DateField label="Início" value={startDate} Icon={Calendar} isDark={isDark} onPress={() => setTarget('start')} />
        </View>
        <View className="min-w-0 flex-1" style={{ marginLeft: 6 }}>
          <DateField label="Término" value={endDate} Icon={CalendarCheck} disabled={!freeDates} isDark={isDark} onPress={() => setTarget('end')} />
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <Text className="flex-1 pr-3 text-sm font-medium text-zinc-800 dark:text-zinc-100">Definir datas livremente</Text>
        <SettingsToggle value={freeDates} onValueChange={onToggleFreeDates} isDark={isDark} />
      </View>

      {freeDates ? (
        <View className="mt-3 flex-row rounded-xl border p-3" style={{ borderColor: isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)', backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)' }}>
          <Info size={16} color="#3b82f6" style={{ marginTop: 1 }} />
          <Text className="ml-2 flex-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400">Recomendamos manter o período de 12 semanas para melhor execução das metas.</Text>
        </View>
      ) : (
        <View className="mt-3 flex-row">
          <Info size={18} strokeWidth={2} stroke="#f59e0b" style={{ marginTop: 1 }} />

          <Text className="ml-2 flex-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">De acordo com o livro The 12 Week Year, ciclos de 12 semanas ajudam a manter o foco, criar urgência e transformar objetivos em resultados concretos.</Text>
        </View>
      )}

      {target && Platform.OS === 'android' ? <DateTimePicker value={pickerValue} mode="date" display="default" onChange={handlePickerChange} /> : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={target !== null} transparent animationType="slide" onRequestClose={() => setTarget(null)}>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <Pressable className="flex-1" onPress={() => setTarget(null)} accessibilityLabel="Fechar" />

            <View className="rounded-t-3xl px-5 pb-10 pt-3" style={{ backgroundColor: isDark ? '#18181b' : '#fafafa' }}>
              <View className="mb-2 h-1 w-10 self-center rounded-full" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />

              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{target === 'end' ? 'Data de término' : 'Data de início'}</Text>
                <Pressable onPress={() => setTarget(null)} accessibilityRole="button" className="px-2 py-1 active:opacity-70">
                  <Text className="text-base font-semibold" style={{ color: ACCENT }}>
                    Concluir
                  </Text>
                </Pressable>
              </View>

              <DateTimePicker value={pickerValue} mode="date" display="spinner" themeVariant={isDark ? 'dark' : 'light'} onChange={handlePickerChange} />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
