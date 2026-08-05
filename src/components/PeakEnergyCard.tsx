/**
 * # Cartão de pico de energia
 *
 * Mostra o melhor score previsto para hoje, a curva do dia e a média por
 * período.
 *
 * ## Decisões de cor
 *
 * A superfície do cartão é neutra. Cor aqui é informação, não decoração: o
 * número e a marcação do pico usam a faixa de energia (verde/amarelo/vermelho),
 * e os blocos de período usam a mesma escala. Um cartão inteiro tingido de
 * indigo — como era antes — gasta o acento de ação em algo que não é acionável,
 * e faz "energia baixa" e "energia alta" parecerem o mesmo estado.
 */

import { Zap } from 'lucide-react-native';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { type EnergyCurvePoint, findPeakWindow, type FlowlyEngineInput, formatPeakWindowLabel, generateEnergyCurve, type PeakWindow, periodHeatmap } from '@/lib/energy';
import { ENERGY, ENERGY_BAND_LABEL, energyBandKey, energyBorder, energySurface, mutedText, surface } from '@/lib/theme';

type PeakEnergyCardProps = {
  /** Input do motor; quando null, mostra estado vazio. */
  input: FlowlyEngineInput | null;
  /** Score atual 0–100 (já efetivo / exibido). */
  currentScore: number;
  isDark: boolean;
  /** Título opcional (onboarding usa copy diferente). */
  title?: string;
  subtitle?: string;
  compact?: boolean;
};

type Geometry = {
  width: number;
  height: number;
  min: number;
  range: number;
};

function pointAt(curve: EnergyCurvePoint[], index: number, geometry: Geometry): { x: number; y: number } {
  const { width, height, min, range } = geometry;
  return {
    x: (index / Math.max(curve.length - 1, 1)) * width,
    y: height - ((curve[index]!.energyScore - min) / range) * height,
  };
}

function linePath(curve: EnergyCurvePoint[], geometry: Geometry, from = 0, to = curve.length): string {
  return curve
    .slice(from, to)
    .map((_, offset) => {
      const { x, y } = pointAt(curve, from + offset, geometry);
      return `${offset === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Mesma linha, fechada na base — a área que recebe o gradiente. */
function areaPath(curve: EnergyCurvePoint[], geometry: Geometry): string {
  const line = linePath(curve, geometry);
  if (!line) return '';

  const last = pointAt(curve, curve.length - 1, geometry);
  const first = pointAt(curve, 0, geometry);
  return `${line} L ${last.x.toFixed(1)} ${geometry.height} L ${first.x.toFixed(1)} ${geometry.height} Z`;
}

export default function PeakEnergyCard({ input, currentScore, isDark, title = 'Pico de energia de hoje', subtitle, compact = false }: PeakEnergyCardProps) {
  const { curve, peak, heat } = useMemo(() => {
    if (!input) return { curve: [] as EnergyCurvePoint[], peak: null as PeakWindow | null, heat: [] };

    const points = generateEnergyCurve(input, undefined, { stepMinutes: 30 });
    return { curve: points, peak: findPeakWindow(points), heat: periodHeatmap(points) };
  }, [input]);

  const peakLabel = formatPeakWindowLabel(peak);
  const displayScore = Math.round(peak?.peakScore ?? currentScore);
  const band = energyBandKey(displayScore);
  const bandColor = ENERGY[band];

  const resolvedSubtitle = subtitle ?? (peak ? `Sua melhor janela é ${peakLabel}. É nela que o Flowly encaixa o que mais importa.` : 'Informe seu horário de sono para ver a curva do seu dia.');

  const muted = mutedText(isDark);
  const width = compact ? 120 : 160;
  const height = compact ? 36 : 48;

  const geometry = useMemo<Geometry | null>(() => {
    if (curve.length === 0) return null;

    const scores = curve.map((point) => point.energyScore);
    const min = Math.min(...scores, 0);
    return { width, height, min, range: Math.max(Math.max(...scores, 1) - min, 1) };
  }, [curve, width, height]);

  return (
    <View className="rounded-2xl border px-4 py-3" style={{ borderColor: surface.border(isDark), backgroundColor: surface.card(isDark) }}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center">
            <Zap size={16} color={bandColor} />
            <Text className="ml-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: muted }}>
              {title}
            </Text>
          </View>

          <Text className="mt-1 text-3xl font-bold tabular-nums" style={{ color: bandColor }} accessibilityLabel={`${displayScore} de 100, ${ENERGY_BAND_LABEL[band]}`}>
            {displayScore}
          </Text>
          <Text className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">{resolvedSubtitle}</Text>
        </View>

        {geometry ? (
          <Svg width={width} height={height} accessibilityLabel={`Curva de energia do dia, com pico ${peakLabel}`}>
            <Defs>
              <LinearGradient id="peakSpark" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={bandColor} stopOpacity={0.35} />
                <Stop offset="1" stopColor={bandColor} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>

            <Path d={areaPath(curve, geometry)} fill="url(#peakSpark)" />

            {/* Faixa do pico: onde a curva vale mais, destacada atrás da linha. */}
            {peak ? (
              <Rect
                x={pointAt(curve, peak.startIndex, geometry).x}
                y={0}
                width={Math.max(pointAt(curve, Math.min(peak.endIndex - 1, curve.length - 1), geometry).x - pointAt(curve, peak.startIndex, geometry).x, 2)}
                height={height}
                fill={bandColor}
                fillOpacity={0.14}
                rx={3}
              />
            ) : null}

            <Path d={linePath(curve, geometry)} stroke={bandColor} strokeWidth={1.5} strokeOpacity={0.45} fill="none" />

            {/* A linha do trecho de pico vem mais forte, para o olho ir nela. */}
            {peak ? <Path d={linePath(curve, geometry, peak.startIndex, Math.min(peak.endIndex, curve.length))} stroke={bandColor} strokeWidth={2.5} fill="none" /> : null}
          </Svg>
        ) : null}
      </View>

      {heat.length > 0 ? (
        <View className="mt-3 flex-row" style={{ gap: 6 }}>
          {heat.map((period) => {
            const periodBand = energyBandKey(period.avgScore);

            return (
              <View
                key={period.key}
                className="flex-1 items-center rounded-xl border py-2"
                style={{ backgroundColor: energySurface(periodBand, isDark), borderColor: energyBorder(periodBand, isDark) }}
                accessibilityLabel={`${period.label}: ${Math.round(period.avgScore)} de 100, ${ENERGY_BAND_LABEL[periodBand]}`}
              >
                {/* Texto forte, não `muted`: sobre fundo tingido o cinza médio cai abaixo de 4.5:1. */}
                <Text className="text-[10px] font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-200">{period.label}</Text>
                <Text className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{Math.round(period.avgScore)}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
