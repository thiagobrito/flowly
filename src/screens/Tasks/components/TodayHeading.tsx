/**
 * Cabeçalho da lista do dia.
 *
 * O rótulo à direita existe porque a ordem da lista não é óbvia: ela vem do
 * FlowScore, que pondera energia exigida, impacto e a energia prevista para o
 * momento. Sem dizer isso, a tela parece uma lista fora de ordem; dizendo, ela
 * vira o diferencial do produto. Não é um controle — não há reordenação manual
 * na Home, e um botão aqui prometeria o que a tela não faz.
 */

import { ArrowDownWideNarrow } from 'lucide-react-native';
import { Text, View } from 'react-native';

import DisplayText from '@/components/DisplayText';
import { formatLongDate } from '@/lib/date';
import { energyBorder, energySurface, energyText, mutedText } from '@/lib/theme';

type TodayHeadingProps = {
  isDark: boolean;
  /** Rótulo do filtro de data ativo. Sem ele, o cabeçalho fala de hoje. */
  title?: string;
  date?: Date;
};

export default function TodayHeading({ isDark, title = 'Hoje', date }: TodayHeadingProps) {
  return (
    <View className="mb-3 flex-row items-end justify-between">
      <View className="flex-1 pr-3">
        <DisplayText weight="bold" className="text-[22px] leading-7 text-zinc-900 dark:text-zinc-50">
          {title}
        </DisplayText>
        <Text className="mt-0.5 text-[13px] capitalize" style={{ color: mutedText(isDark) }}>
          {formatLongDate(date)}
        </Text>
      </View>

      <View
        className="flex-row items-center rounded-full border px-2.5 py-1"
        style={{ backgroundColor: energySurface('high', isDark), borderColor: energyBorder('high', isDark) }}
        accessibilityLabel="As atividades estão ordenadas pela sua energia prevista"
      >
        <ArrowDownWideNarrow size={12} color={energyText('high', isDark)} />
        <Text className="ml-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">Ordenado pela sua energia</Text>
      </View>
    </View>
  );
}
