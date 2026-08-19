/**
 * Cabeçalho de uma lista da Home (Hoje, Atrasado, A definir).
 *
 * O rótulo à direita explica a ordem: horário marcado, e sem horário menor
 * energia / maior impacto. Não é um controle — não há reordenação manual.
 */

import { ArrowDownWideNarrow } from 'lucide-react-native';
import { Text, View } from 'react-native';

import DisplayText from '@/components/DisplayText';
import { formatLongDate } from '@/lib/date';
import { energyBorder, energySurface, energyText, mutedText } from '@/lib/theme';

type TodayHeadingProps = {
  isDark: boolean;
  title?: string;
  date?: Date;
  showDate?: boolean;
  /** Sem valor, o badge de ordenação some — seções secundárias não repetem. */
  sortLabel?: string | null;
};

export default function TodayHeading({ isDark, title = 'Hoje', date, showDate = true, sortLabel = 'Por horário' }: TodayHeadingProps) {
  return (
    <View className="mb-3 flex-row items-end justify-between">
      <View className="flex-1 pr-3">
        <DisplayText weight="bold" className="text-[22px] leading-7 text-zinc-900 dark:text-zinc-50">
          {title}
        </DisplayText>
        {showDate ? (
          <Text className="mt-0.5 text-[13px] capitalize" style={{ color: mutedText(isDark) }}>
            {formatLongDate(date)}
          </Text>
        ) : null}
      </View>

      {sortLabel ? (
        <View
          className="flex-row items-center rounded-full border px-2.5 py-1"
          style={{ backgroundColor: energySurface('high', isDark), borderColor: energyBorder('high', isDark) }}
          accessibilityLabel="As atividades estão ordenadas pelo horário, depois pela energia e pelo impacto"
        >
          <ArrowDownWideNarrow size={12} color={energyText('high', isDark)} />
          <Text className="ml-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">{sortLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}
