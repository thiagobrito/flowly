import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CalendarCheck, CalendarClock, Info } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

import { formatDate, parseIsoDate, toIsoDate } from '@/screens/Config/Goals/dateUtils';
import { cycleWeeks } from '@/screens/Goals/data';

const ACCENT = '#6366f1';

type PickerTarget = 'start' | 'end' | null;

type DateRangeStepProps = {
  startDate: string;
  endDate: string;
  isDark: boolean;
  onChange: (cycle: { startDate: string; endDate: string }) => void;
};

function DateField({ label, value, Icon, isDark, onPress }: { label: string; value: string; Icon: typeof CalendarClock; isDark: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className="flex-1 active:opacity-80">
      <View className="rounded-2xl border p-3.5" style={{ borderColor: ACCENT, backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)' }}>
        <View className="flex-row items-center gap-2">
          <Icon size={18} color={ACCENT} />
          <View className="min-w-0 flex-1">
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">{label}</Text>
            <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-50" numberOfLines={1}>
              {formatDate(value)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function DateRangeStep({ startDate, endDate, isDark, onChange }: DateRangeStepProps) {
  const [target, setTarget] = useState<PickerTarget>(null);

  const weeks = useMemo(() => cycleWeeks(startDate, endDate), [startDate, endDate]);
  const pickerValue = useMemo(() => parseIsoDate(target === 'end' ? endDate : startDate), [target, startDate, endDate]);

  const applyDate = (selectedDate: Date) => {
    const iso = toIsoDate(selectedDate);
    if (target === 'start') onChange({ startDate: iso, endDate });
    else if (target === 'end') onChange({ startDate, endDate: iso });
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
    <View>
      <View className="flex-row gap-3">
        <DateField label="Início" value={startDate} Icon={CalendarClock} isDark={isDark} onPress={() => setTarget('start')} />
        <DateField label="Término" value={endDate} Icon={CalendarCheck} isDark={isDark} onPress={() => setTarget('end')} />
      </View>

      <View className="mt-4 items-center rounded-2xl py-3" style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)' }}>
        <Text className="text-3xl font-bold" style={{ color: ACCENT }}>
          {weeks}
        </Text>
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">{weeks === 1 ? 'semana de ciclo' : 'semanas de ciclo'}</Text>
      </View>

      <View className="mt-3 flex-row rounded-xl border p-3" style={{ borderColor: isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)', backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)' }}>
        <Info size={16} color="#3b82f6" style={{ marginTop: 1 }} />
        <Text className="ml-2 flex-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400">Segundo o método The 12 Week Year, ciclos de 12 semanas mantêm o foco e transformam objetivos em resultados.</Text>
      </View>

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
