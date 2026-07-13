import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { LucideIcon } from 'lucide-react-native';
import { Calendar, Clock, Link2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { OptionChip, SegmentedToggle, Stepper, WeekdayToggles } from './components';
import type { FrequencyConfig, FrequencyId } from './data';
import { DEFAULT_FREQUENCY_CONFIG, FREQUENCIES, TRIGGER_EVENTS } from './data';

type FrequencyPickerProps = {
  value: FrequencyConfig | null;
  onChange: (config: FrequencyConfig) => void;
  isDark: boolean;
  accent: string;
};

type OnceConfig = Extract<FrequencyConfig, { kind: 'once' }>;
type DailyConfig = Extract<FrequencyConfig, { kind: 'daily' }>;
type WeeklyConfig = Extract<FrequencyConfig, { kind: 'weekly' }>;
type IntervalConfig = Extract<FrequencyConfig, { kind: 'interval' }>;
type TriggerConfig = Extract<FrequencyConfig, { kind: 'trigger' }>;

type PickerMode = 'date' | 'time' | null;

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;

const formatDate = (isoDate: string) => {
  const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number);
  return `${String(day).padStart(2, '0')} ${MONTHS_SHORT[month - 1] ?? ''} ${year}`;
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toTimeString = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const parseIsoDate = (isoDate: string | null) => {
  if (!isoDate) return new Date();
  const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const parseTime = (time: string | null, baseDate: Date) => {
  if (!time) return baseDate;
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const TODAY_ISO = () => toIsoDate(new Date());
const TOMORROW_ISO = () => toIsoDate(addDays(new Date(), 1));

function DateTimeField({ label, value, placeholder, Icon, onPress, isDark, accent }: { label: string; value: string | null; placeholder: string; Icon: LucideIcon; onPress: () => void; isDark: boolean; accent: string }) {
  let borderColor = 'rgba(0,0,0,0.08)';
  let iconColor = '#71717a';
  let valueColor = '#a1a1aa';

  if (value) {
    borderColor = accent;
    iconColor = accent;
    valueColor = isDark ? '#fafafa' : '#18181b';
  } else if (isDark) {
    borderColor = 'rgba(255,255,255,0.12)';
    iconColor = '#a1a1aa';
  }

  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="flex-1 active:opacity-80" style={{ minWidth: 0 }}>
      <View
        className="rounded-2xl border p-3"
        style={{
          borderColor,
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
        }}
      >
        <View className="flex-row items-center gap-2">
          <Icon size={16} color={iconColor} />
          <View className="min-w-0 flex-1">
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">{label}</Text>
            <Text className="text-sm font-medium" style={{ color: valueColor }} numberOfLines={1} ellipsizeMode="tail">
              {value ?? placeholder}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function QuickChip({ label, selected, onPress, isDark, accent }: { label: string; selected: boolean; onPress: () => void; isDark: boolean; accent: string }) {
  const emptyBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const emptyBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)';
  const emptyText = isDark ? '#a1a1aa' : '#71717a';

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} className="active:opacity-80">
      <View
        className="rounded-full px-4 py-2"
        style={{
          borderWidth: 1,
          borderColor: selected ? accent : emptyBorder,
          backgroundColor: selected ? `${accent}18` : emptyBg,
        }}
      >
        <Text className="text-sm font-semibold" style={{ color: selected ? accent : emptyText }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function OnceConfigPanel({ config, onChange, isDark, accent }: { config: OnceConfig; onChange: (config: OnceConfig) => void; isDark: boolean; accent: string }) {
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);

  const pickerValue = useMemo(() => {
    const baseDate = parseIsoDate(config.date);
    return pickerMode === 'time' ? parseTime(config.time, baseDate) : baseDate;
  }, [config.date, config.time, pickerMode]);

  const handlePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setPickerMode(null);
    if (event.type === 'dismissed' || !selectedDate) {
      setPickerMode(null);
      return;
    }

    if (pickerMode === 'date') {
      onChange({ ...config, date: toIsoDate(selectedDate) });
      if (Platform.OS === 'ios') setPickerMode(null);
      return;
    }

    if (pickerMode === 'time') {
      onChange({ ...config, time: toTimeString(selectedDate) });
      if (Platform.OS === 'ios') setPickerMode(null);
    }
  };

  const clearTime = () => onChange({ ...config, time: null });
  const setNow = () => onChange({ ...config, time: toTimeString(new Date()) });

  const todayIso = TODAY_ISO();
  const tomorrowIso = TOMORROW_ISO();

  return (
    <View>
      <View className="-mx-1 flex-row flex-wrap items-center">
        <View className="p-1">
          <QuickChip label="Hoje" selected={config.date === todayIso} onPress={() => onChange({ ...config, date: todayIso })} isDark={isDark} accent={accent} />
        </View>
        <View className="p-1">
          <QuickChip label="Amanhã" selected={config.date === tomorrowIso} onPress={() => onChange({ ...config, date: tomorrowIso })} isDark={isDark} accent={accent} />
        </View>
      </View>

      <View className="flex-row">
        <View className="mt-2 min-w-0 flex-[3]" style={{ marginRight: 6 }}>
          <DateTimeField label="Data" value={config.date ? formatDate(config.date) : null} placeholder="Selecionar" Icon={Calendar} onPress={() => setPickerMode('date')} isDark={isDark} accent={accent} />
        </View>
        <View className="mt-2 min-w-0 flex-[2]" style={{ marginLeft: 6 }}>
          <DateTimeField label="Hora" value={config.time} placeholder="Opcional" Icon={Clock} onPress={() => setPickerMode('time')} isDark={isDark} accent={accent} />
        </View>
      </View>

      <View className="mt-2 flex-row items-center gap-4">
        <Pressable onPress={setNow} className="self-start active:opacity-70">
          <Text className="text-xs font-medium" style={{ color: accent }}>
            Agora
          </Text>
        </Pressable>
        {config.time ? (
          <Pressable onPress={clearTime} className="self-start active:opacity-70">
            <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Remover hora</Text>
          </Pressable>
        ) : null}
      </View>

      {pickerMode ? <DateTimePicker value={pickerValue} mode={pickerMode} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handlePickerChange} /> : null}
    </View>
  );
}

function DailyConfigPanel({ config, onChange, isDark, accent }: { config: DailyConfig; onChange: (config: DailyConfig) => void; isDark: boolean; accent: string }) {
  const mode = config.everyDay ? 'everyday' : 'specific';

  return (
    <View>
      <SegmentedToggle
        options={[
          { value: 'everyday', label: 'Todo dia' },
          { value: 'specific', label: 'Dias específicos' },
        ]}
        value={mode}
        onChange={(next) =>
          onChange({
            ...config,
            everyDay: next === 'everyday',
            days: next === 'everyday' ? [] : config.days,
          })
        }
        accent={accent}
        isDark={isDark}
      />

      {!config.everyDay ? (
        <View className="mt-4">
          <WeekdayToggles value={config.days} onChange={(days) => onChange({ ...config, days })} accent={accent} isDark={isDark} />
        </View>
      ) : null}
    </View>
  );
}

function WeeklyConfigPanel({ config, onChange, isDark, accent }: { config: WeeklyConfig; onChange: (config: WeeklyConfig) => void; isDark: boolean; accent: string }) {
  return (
    <View>
      <SegmentedToggle
        options={[
          { value: 'count', label: 'X vezes' },
          { value: 'days', label: 'Dias fixos' },
        ]}
        value={config.mode}
        onChange={(next) =>
          onChange({
            ...config,
            mode: next as 'count' | 'days',
            days: next === 'days' ? config.days : [],
          })
        }
        accent={accent}
        isDark={isDark}
      />

      <View className="mt-4">
        {config.mode === 'count' ? (
          <Stepper value={config.count} onChange={(count) => onChange({ ...config, count })} min={1} max={7} suffix="vezes por semana" accent={accent} isDark={isDark} />
        ) : (
          <WeekdayToggles value={config.days} onChange={(days) => onChange({ ...config, days })} accent={accent} isDark={isDark} />
        )}
      </View>
    </View>
  );
}

function IntervalConfigPanel({ config, onChange, isDark, accent }: { config: IntervalConfig; onChange: (config: IntervalConfig) => void; isDark: boolean; accent: string }) {
  return (
    <View>
      <Text className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">A cada</Text>
      <Stepper value={config.everyNDays} onChange={(everyNDays) => onChange({ ...config, everyNDays })} min={1} max={30} suffix={config.everyNDays === 1 ? 'dia' : 'dias'} accent={accent} isDark={isDark} />
    </View>
  );
}

function TriggerConfigPanel({ config, onChange, isDark, accent }: { config: TriggerConfig; onChange: (config: TriggerConfig) => void; isDark: boolean; accent: string }) {
  return (
    <View className="-mx-1 flex-row flex-wrap">
      {TRIGGER_EVENTS.map((event) => (
        <View key={event.id} className="w-1/2 p-1">
          <OptionChip label={event.label} Icon={Link2} selected={config.eventId === event.id} accent={accent} isDark={isDark} onPress={() => onChange({ ...config, eventId: event.id })} className="w-full" />
        </View>
      ))}
    </View>
  );
}

function ConfigPanel({ config, onChange, isDark, accent }: { config: FrequencyConfig; onChange: (config: FrequencyConfig) => void; isDark: boolean; accent: string }) {
  switch (config.kind) {
    case 'notime':
      return null;
    case 'once':
      return <OnceConfigPanel config={config} onChange={onChange} isDark={isDark} accent={accent} />;
    case 'daily':
      return <DailyConfigPanel config={config} onChange={onChange} isDark={isDark} accent={accent} />;
    case 'weekly':
      return <WeeklyConfigPanel config={config} onChange={onChange} isDark={isDark} accent={accent} />;
    case 'interval':
      return <IntervalConfigPanel config={config} onChange={onChange} isDark={isDark} accent={accent} />;
    case 'trigger':
      return <TriggerConfigPanel config={config} onChange={onChange} isDark={isDark} accent={accent} />;
    default:
      return null;
  }
}

export function FrequencyPicker({ value, onChange, isDark, accent }: FrequencyPickerProps) {
  const selectedKind = value?.kind ?? null;

  const handleSelectMode = (kind: FrequencyId) => {
    if (value?.kind === kind) return;
    // "Data Específica" já entra com hoje pré-selecionado: é o caso mais comum e
    // evita depender do spinner (que só dispara onChange ao sair do valor exibido).
    if (kind === 'once') {
      onChange({ kind: 'once', date: TODAY_ISO(), time: null });
      return;
    }
    onChange(DEFAULT_FREQUENCY_CONFIG[kind]);
  };

  return (
    <View>
      <View className="-mx-1 flex-row flex-wrap">
        {FREQUENCIES.map((item) => (
          <View key={item.id} className="w-1/2 p-1">
            <OptionChip label={item.label} Icon={item.Icon} selected={selectedKind === item.id} accent={accent} isDark={isDark} onPress={() => handleSelectMode(item.id)} className="w-full" />
          </View>
        ))}
      </View>

      {value && value.kind !== 'notime' ? (
        <View
          className="mt-4 rounded-2xl border p-4"
          style={{
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
          }}
        >
          <ConfigPanel config={value} onChange={onChange} isDark={isDark} accent={accent} />
        </View>
      ) : null}
    </View>
  );
}
