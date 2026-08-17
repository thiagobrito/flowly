/**
 * Faixa de energia atrás de uma hora da grade.
 *
 * O `calendar-kit` desenha cada linha horizontal dentro de um `View` absoluto
 * de 1px de altura, posicionado em `top: index / totalSlots`. Quando
 * `renderCustomHorizontalLine` está presente, a biblioteca deixa de pintar o
 * fundo dessa linha e apenas renderiza o que devolvemos aqui dentro — como o
 * `overflow` é visível, um filho mais alto que 1px transborda para baixo e
 * cobre a hora inteira. É por isso que a faixa precisa saber a altura do slot:
 * ela não herda nada do pai.
 *
 * Sem `pointerEvents="none"` a faixa engoliria o toque que cria evento no
 * fundo da grade. O `View` externo do calendar-kit já é `none`, mas o valor não
 * é herdado por filhos posicionados de forma absoluta em todas as plataformas.
 */

import { Text, View } from 'react-native';

import { ENERGY, energyBandKey, energyWash } from '@/lib/theme';

type CalendarEnergyRowProps = {
  /** Nível 0–5 da hora, ou `undefined` quando não há dados de energia. */
  level: number | undefined;
  /** Altura de uma hora na grade, em px. */
  slotHeight: number;
  borderColor: string;
  isDark: boolean;
  /** `PICO` ou `QUEDA`, quando esta é a hora extrema do dia. */
  marker?: 'peak' | 'dip';
};

const MARKER_LABEL = { peak: 'PICO', dip: 'QUEDA' } as const;

export default function CalendarEnergyRow({ level, slotHeight, borderColor, isDark, marker }: CalendarEnergyRowProps) {
  const band = level === undefined ? null : energyBandKey(level * 20);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: slotHeight }}>
      {band ? <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: energyWash(band, isDark) }} /> : null}

      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1, backgroundColor: borderColor }} />

      {marker && band ? (
        <View style={{ position: 'absolute', right: 6, top: 4, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1, backgroundColor: ENERGY[band] }}>
          <Text style={{ fontSize: 9, fontWeight: '800', letterSpacing: 0.6, color: '#ffffff' }}>{MARKER_LABEL[marker]}</Text>
        </View>
      ) : null}
    </View>
  );
}
