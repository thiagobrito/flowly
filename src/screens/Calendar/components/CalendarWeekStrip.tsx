/**
 * Faixa DOM–SÁB da semana visível.
 *
 * O calendário mostra um dia por vez (`numberOfDays={1}`), e as setas do
 * cabeçalho só andam de um em um. A faixa dá o que faltava: onde estou na
 * semana e como pular direto para quinta.
 */

import { Pressable, Text, View } from 'react-native';

import { localDateKey, startOfLocalDay, toLocalISOString } from '@/lib/date';
import { ACCENT, accentOn, mutedText } from '@/lib/theme';

const WEEKDAY_INITIALS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

type CalendarWeekStripProps = {
  /** ISO do dia exibido no calendário. */
  visibleDate: string;
  isDark: boolean;
  onSelect: (dateISO: string) => void;
};

/** Os sete dias da semana (domingo a sábado) que contêm `reference`. */
export function weekDays(reference: Date): Date[] {
  const sunday = new Date(reference.getTime() - reference.getDay() * DAY_MS);
  return Array.from({ length: 7 }, (_, index) => new Date(sunday.getTime() + index * DAY_MS));
}

export default function CalendarWeekStrip({ visibleDate, isDark, onSelect }: CalendarWeekStripProps) {
  const selectedKey = localDateKey(startOfLocalDay(visibleDate));
  const todayKey = localDateKey();
  const days = weekDays(startOfLocalDay(visibleDate));
  const muted = mutedText(isDark);

  return (
    <View className="mb-2 flex-row justify-between">
      {days.map((day) => {
        const key = localDateKey(day);
        const isSelected = key === selectedKey;
        const isToday = key === todayKey;

        let numberColor = isDark ? '#fafafa' : '#18181b';
        if (isSelected) numberColor = '#ffffff';
        else if (isToday) numberColor = accentOn(isDark);

        return (
          <Pressable
            key={key}
            onPress={() => onSelect(toLocalISOString(day))}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${WEEKDAY_INITIALS[day.getDay()]}, dia ${day.getDate()}`}
            className="flex-1 items-center py-1 active:opacity-70"
          >
            <Text className="text-[10px] font-semibold" style={{ color: isSelected ? accentOn(isDark) : muted }}>
              {WEEKDAY_INITIALS[day.getDay()]}
            </Text>

            <View className="mt-1 size-8 items-center justify-center rounded-full" style={{ backgroundColor: isSelected ? ACCENT : 'transparent' }}>
              <Text className="text-[13px] font-bold tabular-nums" style={{ color: numberColor }}>
                {day.getDate()}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
