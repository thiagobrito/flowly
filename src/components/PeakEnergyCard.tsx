/**
 * # Cartão de pico de energia
 *
 * Mostra o melhor score previsto para hoje, a curva do dia e a média por
 * período.
 *
 * ## Por que o gráfico é o protagonista
 *
 * O número sozinho não explica nada: "82" só vira decisão quando se vê *quando*
 * ele acontece. Por isso a curva ocupa a largura do cartão, tem eixo de horas e
 * marca o pico com um ponto — o usuário precisa sair daqui sabendo a que horas
 * atacar o trabalho difícil, não sabendo que hoje é um dia bom.
 *
 * ## Decisões de cor
 *
 * A superfície do cartão é neutra. Cor aqui é informação, não decoração: o
 * número e a marcação do pico usam a faixa de energia, e os blocos de período
 * usam a mesma escala. Um cartão inteiro tingido do acento — como era antes —
 * gasta a cor de ação em algo que não é acionável, e faz "energia baixa" e
 * "energia alta" parecerem o mesmo estado.
 *
 * A linha da curva não tem uma cor só: ela é um gradiente ponto a ponto pela
 * faixa de cada instante, então o verde do pico e o terracota do vale aparecem
 * no mesmo traço. É a informação que o eixo Y já dá, repetida no canal que o
 * olho lê mais rápido.
 */

import { Zap } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { type EnergyCurvePoint, findPeakWindow, type FlowlyEngineInput, formatPeakWindowLabel, generateEnergyCurve, type PeakWindow, periodHeatmap } from '@/lib/energy';
import { ENERGY, ENERGY_BAND_LABEL, ENERGY_BAND_SHORT, energyBandKey, energyBorder, energySurface, energyText, mutedText, surface } from '@/lib/theme';

type PeakEnergyCardProps = {
  /** Input do motor; quando null, mostra estado vazio. */
  input: FlowlyEngineInput | null;
  /** Score atual 0–100 (já efetivo / exibido). */
  currentScore: number;
  isDark: boolean;
  /** Título opcional (onboarding usa copy diferente). */
  title?: string;
  subtitle?: string;
};

const CHART_HEIGHT = 104;

/** Largura usada até o `onLayout` medir a real. Evita um primeiro quadro vazio. */
const FALLBACK_WIDTH = 300;

/**
 * Caixa do rótulo da janela de pico.
 *
 * Ela é mais larga que a faixa de propósito: amarrar o rótulo à largura da
 * banda faz `10h às 13h` virar `10h às…` quando a janela é curta. A caixa é
 * centrada na banda e presa às bordas do gráfico, então o texto sai inteiro sem
 * vazar do cartão.
 */
const LABEL_BOX_WIDTH = 96;

/** Quantas marcas de hora cabem embaixo do gráfico sem virar sopa de números. */
const HOUR_TICKS = 5;

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

function linePath(curve: EnergyCurvePoint[], geometry: Geometry): string {
  return curve
    .map((_, index) => {
      const { x, y } = pointAt(curve, index, geometry);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
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

/** Índice do ponto de maior energia — onde vai o marcador do pico. */
function peakIndex(curve: EnergyCurvePoint[]): number {
  let best = 0;
  for (let i = 1; i < curve.length; i += 1) {
    if (curve[i]!.energyScore > curve[best]!.energyScore) best = i;
  }
  return best;
}

function hourLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getHours()}h`;
}

/**
 * Marcas do eixo X, distribuídas do primeiro ao último ponto da curva.
 *
 * As horas saem da própria curva, e não de uma faixa fixa tipo 6h–22h: quem
 * acorda às 5h30 e dorme à meia-noite tem um dia diferente, e o eixo tem que
 * ser o dele.
 */
function hourTicks(curve: EnergyCurvePoint[]): { index: number; label: string }[] {
  if (curve.length === 0) return [];

  const ticks: { index: number; label: string }[] = [];
  for (let i = 0; i < HOUR_TICKS; i += 1) {
    const index = Math.round((i / (HOUR_TICKS - 1)) * (curve.length - 1));
    ticks.push({ index, label: hourLabel(curve[index]!.time) });
  }
  return ticks;
}

export default function PeakEnergyCard({ input, currentScore, isDark, title = 'Pico de energia de hoje', subtitle }: PeakEnergyCardProps) {
  const [width, setWidth] = useState(FALLBACK_WIDTH);

  const { curve, peak, heat } = useMemo(() => {
    if (!input) return { curve: [] as EnergyCurvePoint[], peak: null as PeakWindow | null, heat: [] };

    const points = generateEnergyCurve(input, undefined, { stepMinutes: 30 });
    return { curve: points, peak: findPeakWindow(points), heat: periodHeatmap(points) };
  }, [input]);

  const peakLabel = formatPeakWindowLabel(peak);
  const displayScore = Math.round(peak?.peakScore ?? currentScore);
  const band = energyBandKey(displayScore);
  const bandColor = energyText(band, isDark);

  const resolvedSubtitle = subtitle ?? (peak ? `Sua melhor janela é ${peakLabel}. É nela que o Flowly encaixa o que mais importa.` : 'Informe seu horário de sono para ver a curva do seu dia.');

  const muted = mutedText(isDark);

  const geometry = useMemo<Geometry | null>(() => {
    if (curve.length === 0) return null;

    const scores = curve.map((point) => point.energyScore);
    const min = Math.min(...scores, 0);
    return { width, height: CHART_HEIGHT, min, range: Math.max(Math.max(...scores, 1) - min, 1) };
  }, [curve, width]);

  const ticks = useMemo(() => hourTicks(curve), [curve]);
  const apex = geometry ? pointAt(curve, peakIndex(curve), geometry) : null;

  const bandStart = geometry && peak ? pointAt(curve, peak.startIndex, geometry).x : 0;
  const bandEnd = geometry && peak ? pointAt(curve, Math.min(peak.endIndex - 1, curve.length - 1), geometry).x : 0;
  const bandWidth = Math.max(bandEnd - bandStart, 2);
  const labelLeft = Math.min(Math.max((bandStart + bandEnd) / 2 - LABEL_BOX_WIDTH / 2, 0), Math.max(width - LABEL_BOX_WIDTH, 0));
  // O ápice é sempre o ponto mais alto do gráfico, então o rótulo desce um
  // pouco para não cobrir justamente o ponto que ele explica.
  const labelTop = apex ? Math.min(Math.max(apex.y + 12, 4), CHART_HEIGHT - 24) : 4;

  return (
    <View className="rounded-2xl border p-4" style={{ borderColor: surface.border(isDark), backgroundColor: surface.card(isDark) }}>
      <View className="flex-row items-center">
        <Zap size={14} color={bandColor} />
        <Text className="ml-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: muted }}>
          {title}
        </Text>
      </View>

      <View className="mt-2 flex-row items-baseline">
        <Text className="text-[44px] font-bold tabular-nums leading-[48px]" style={{ color: bandColor }} accessibilityLabel={`${displayScore} de 100, ${ENERGY_BAND_LABEL[band]}`}>
          {displayScore}
        </Text>
        <Text className="ml-1.5 text-sm font-medium" style={{ color: muted }}>
          de 100
        </Text>
      </View>

      <Text className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-300">{resolvedSubtitle}</Text>

      {geometry ? (
        <View className="mt-4" onLayout={(event) => setWidth(Math.max(Math.round(event.nativeEvent.layout.width), 1))}>
          <Svg width={width} height={CHART_HEIGHT} accessibilityLabel={`Curva de energia do dia, com pico ${peakLabel}`}>
            <Defs>
              <LinearGradient id="peakArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={bandColor} stopOpacity={0.3} />
                <Stop offset="1" stopColor={bandColor} stopOpacity={0.02} />
              </LinearGradient>

              {/*
               * Um stop por ponto da curva: o traço muda de cor onde a energia
               * muda de faixa, sem precisar quebrar o path em pedaços.
               */}
              <LinearGradient id="peakLine" x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
                {curve.map((point, index) => (
                  <Stop key={point.time} offset={index / Math.max(curve.length - 1, 1)} stopColor={ENERGY[energyBandKey(point.energyScore)]} />
                ))}
              </LinearGradient>
            </Defs>

            {ticks.map((tick) => (
              <Line key={`grid-${tick.index}`} x1={pointAt(curve, tick.index, geometry).x} y1={0} x2={pointAt(curve, tick.index, geometry).x} y2={CHART_HEIGHT} stroke={surface.border(isDark)} strokeWidth={1} />
            ))}

            {/*
             * A banda é o que o cartão quer que se leia primeiro, então ela tem
             * preenchimento e contorno: só o tom claro se perdia contra a área
             * da curva, que também é verde no pico.
             */}
            {peak ? <Rect x={bandStart} y={0} width={bandWidth} height={CHART_HEIGHT} fill={ENERGY.high} fillOpacity={isDark ? 0.22 : 0.16} stroke={ENERGY.high} strokeOpacity={isDark ? 0.6 : 0.45} strokeWidth={1} rx={8} /> : null}

            <Path d={areaPath(curve, geometry)} fill="url(#peakArea)" />
            <Path d={linePath(curve, geometry)} stroke="url(#peakLine)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />

            {apex ? (
              <>
                <Circle cx={apex.x} cy={apex.y} r={6} fill={surface.card(isDark)} />
                <Circle cx={apex.x} cy={apex.y} r={4} fill={ENERGY.high} />
              </>
            ) : null}
          </Svg>

          {peak ? (
            <View pointerEvents="none" className="absolute items-center" style={{ left: labelLeft, width: LABEL_BOX_WIDTH, top: labelTop }}>
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: energySurface('high', isDark), borderWidth: 1, borderColor: energyBorder('high', isDark) }}>
                <Text numberOfLines={1} className="text-[10px] font-bold text-zinc-800 dark:text-zinc-100">
                  {peak.startISO ? `${hourLabel(peak.startISO)} às ${hourLabel(peak.endISO)}` : ''}
                </Text>
              </View>
            </View>
          ) : null}

          <View className="mt-1.5 flex-row justify-between">
            {ticks.map((tick) => (
              <Text key={`tick-${tick.index}`} className="text-[10px] tabular-nums" style={{ color: muted }}>
                {tick.label}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {heat.length > 0 ? (
        <View className="mt-4 flex-row" style={{ gap: 6 }}>
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
                <Text className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{Math.round(period.avgScore)}</Text>
                <Text className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-200">{ENERGY_BAND_SHORT[periodBand]}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
