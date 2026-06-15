import { Zap } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { startOfLocalDay } from '@/lib/date';
import { computeEnergyAtMoment, type FlowlyEngineInput } from '@/lib/energy';

import type { Task } from '../../NewTask/data';

const ACCENT = '#3b82f6';
const MARKER_COLOR = '#22c55e';

const CHART_HEIGHT = 220;
const PADDING = { top: 20, right: 14, bottom: 26, left: 30 } as const;
const HOURS_IN_DAY = 24;
const HIT_RADIUS = 16;
const TOOLTIP_PADDING_H = 8;
const TOOLTIP_PADDING_V = 6;
const TOOLTIP_LINE_HEIGHT = 13;

type EnergyDayChartProps = {
  input: FlowlyEngineInput | null;
  tasks: Task[];
  /** ISO do dia selecionado nos chips. */
  selectedDay: string;
  isDark: boolean;
};

type TaskMarker = {
  title: string;
  /** Hora do dia (fração), ex.: 14.5 = 14h30. */
  hour: number;
  energy: number;
  completedAt: Date;
};

/** Reancora wakeTime/bedTime do input no dia selecionado, preservando os horários. */
function anchorInputToDay(input: FlowlyEngineInput, day: Date): FlowlyEngineInput {
  if (!input.wakeTime) return input;

  const wakeSrc = new Date(input.wakeTime);
  if (Number.isNaN(wakeSrc.getTime())) return input;

  const wake = new Date(day);
  wake.setHours(wakeSrc.getHours(), wakeSrc.getMinutes(), 0, 0);

  let bedTime: string | null = null;
  if (input.bedTime) {
    const bedSrc = new Date(input.bedTime);
    if (!Number.isNaN(bedSrc.getTime())) {
      // Mantém o intervalo original acordar -> dormir.
      const deltaMs = bedSrc.getTime() - wakeSrc.getTime();
      bedTime = new Date(wake.getTime() + deltaMs).toISOString();
    }
  }

  return { ...input, wakeTime: wake.toISOString(), bedTime };
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type Point = { x: number; y: number };

type TextAnchor = 'start' | 'middle' | 'end';

function hourTextAnchor(hour: number): TextAnchor {
  if (hour === 0) return 'start';
  if (hour === 24) return 'end';
  return 'middle';
}

/** Largura média por caractere (fontSize ~10) — usada para estimar largura do tooltip. */
const AVG_CHAR_WIDTH = 5.1;

function truncateTitle(title: string, maxChars: number): string {
  if (title.length <= maxChars) return title;
  if (maxChars <= 1) return '…';
  return `${title.slice(0, maxChars - 1)}…`;
}

function formatCompletedTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function maxTooltipTitleChars(width: number): number {
  const plotWidth = Math.max(0, width - PADDING.left - PADDING.right);
  return Math.max(12, Math.floor((plotWidth - TOOLTIP_PADDING_H * 2) / AVG_CHAR_WIDTH));
}

type TooltipLayout = {
  rectX: number;
  rectY: number;
  rectW: number;
  rectH: number;
  title: string;
  time: string;
  textX: number;
  textAnchor: TextAnchor;
};

function computeTooltipLayout(marker: TaskMarker, x: number, y: number, width: number): TooltipLayout {
  const maxChars = maxTooltipTitleChars(width);
  const title = truncateTitle(marker.title, maxChars);
  const time = formatCompletedTime(marker.completedAt);

  const titleWidth = title.length * AVG_CHAR_WIDTH;
  const timeWidth = time.length * AVG_CHAR_WIDTH * 0.9;
  const rectW = Math.min(Math.max(titleWidth, timeWidth) + TOOLTIP_PADDING_H * 2, width - PADDING.left - PADDING.right);
  const rectH = TOOLTIP_PADDING_V * 2 + TOOLTIP_LINE_HEIGHT * 2;

  const showBelow = y - rectH - 12 < PADDING.top;
  const rectY = showBelow ? y + 12 : y - rectH - 12;

  const leftBound = PADDING.left;
  const rightBound = width - PADDING.right;
  let rectX = x - rectW / 2;
  if (rectX < leftBound) rectX = leftBound;
  if (rectX + rectW > rightBound) rectX = rightBound - rectW;

  const textX = rectX + rectW / 2;

  return { rectX, rectY, rectW, rectH, title, time, textX, textAnchor: 'middle' };
}

/** Converte a lista de pontos em um path suavizado (Catmull-Rom -> Bézier). */
function smoothPath(points: Point[]): string {
  const first = points[0];
  if (!first || points.length < 2) return '';

  const at = (index: number): Point => points[Math.min(Math.max(index, 0), points.length - 1)] ?? first;

  let d = `M ${first.x} ${first.y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function EnergyDayChart({ input, tasks, selectedDay, isDark }: EnergyDayChartProps) {
  const [width, setWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const mutedColor = isDark ? '#a1a1aa' : '#71717a';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const labelColor = isDark ? '#e4e4e7' : '#3f3f46';
  const tooltipBg = isDark ? '#27272a' : '#ffffff';
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  const day = useMemo(() => startOfLocalDay(selectedDay), [selectedDay]);

  useEffect(() => {
    setSelectedIndex(null);
  }, [selectedDay]);

  const { curve, markers } = useMemo(() => {
    if (!input) return { curve: [] as number[], markers: [] as TaskMarker[] };

    const dayInput = anchorInputToDay(input, day);

    const energyAt = (hourFraction: number): number => {
      const moment = new Date(day.getTime() + hourFraction * 3600_000);
      return computeEnergyAtMoment(dayInput, moment.toISOString()).doubleEnergyScore;
    };

    const hourly = Array.from({ length: HOURS_IN_DAY + 1 }, (_, hour) => energyAt(hour));

    const taskMarkers = tasks
      .flatMap((task) =>
        (task.completed ?? [])
          .map((iso) => new Date(iso))
          .filter((date) => !Number.isNaN(date.getTime()) && isSameLocalDay(date, day))
          .map((date) => {
            const hour = date.getHours() + date.getMinutes() / 60;
            return { title: task.name, hour, energy: energyAt(hour), completedAt: date };
          }),
      )
      .sort((a, b) => a.hour - b.hour);

    return { curve: hourly, markers: taskMarkers };
  }, [input, tasks, day]);

  const plotWidth = Math.max(0, width - PADDING.left - PADDING.right);
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const xFor = (hour: number) => PADDING.left + (hour / HOURS_IN_DAY) * plotWidth;
  const yFor = (energy: number) => PADDING.top + (1 - energy / 100) * plotHeight;

  const linePoints = curve.map((energy, hour) => ({ x: xFor(hour), y: yFor(energy) }));
  const lineD = smoothPath(linePoints);
  const areaD = lineD ? `${lineD} L ${xFor(HOURS_IN_DAY)} ${yFor(0)} L ${xFor(0)} ${yFor(0)} Z` : '';

  const isToday = isSameLocalDay(day, new Date());
  const nowHour = new Date().getHours() + new Date().getMinutes() / 60;

  const selectedMarker = selectedIndex !== null ? markers[selectedIndex] : null;
  const selectedTooltip = selectedMarker && selectedIndex !== null ? computeTooltipLayout(selectedMarker, xFor(selectedMarker.hour), yFor(selectedMarker.energy), width) : null;

  const header = (
    <View className="flex-row items-center gap-2.5 px-3 py-2">
      <View className="size-9 items-center justify-center rounded-full bg-blue-500/15">
        <Zap size={18} color={ACCENT} />
      </View>
      <Text className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">Energia ao longo do dia</Text>
    </View>
  );

  return (
    <View className="overflow-hidden rounded-2xl bg-white p-2">
      {header}

      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 && curve.length > 0 ? (
          <Svg width={width} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="energyFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={ACCENT} stopOpacity={0.25} />
                <Stop offset="1" stopColor={ACCENT} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>

            {[0, 25, 50, 75, 100].map((value) => (
              <Line key={value} x1={PADDING.left} y1={yFor(value)} x2={width - PADDING.right} y2={yFor(value)} stroke={gridColor} strokeWidth={1} />
            ))}

            {[0, 50, 100].map((value) => (
              <SvgText key={value} x={PADDING.left - 6} y={yFor(value) + 3} fontSize={9} fill={mutedColor} textAnchor="end">
                {value}
              </SvgText>
            ))}

            {[0, 6, 12, 18, 24].map((hour) => (
              <SvgText key={hour} x={xFor(hour)} y={CHART_HEIGHT - PADDING.bottom + 14} fontSize={9} fill={mutedColor} textAnchor={hourTextAnchor(hour)}>
                {`${hour}h`}
              </SvgText>
            ))}

            {areaD ? <Path d={areaD} fill="url(#energyFill)" /> : null}
            {lineD ? <Path d={lineD} stroke={ACCENT} strokeWidth={2} fill="none" /> : null}

            {isToday ? <Line x1={xFor(nowHour)} y1={PADDING.top} x2={xFor(nowHour)} y2={CHART_HEIGHT - PADDING.bottom} stroke={mutedColor} strokeWidth={1} opacity={0.75} /> : null}

            {selectedIndex !== null ? <Rect x={0} y={0} width={width} height={CHART_HEIGHT} fill="transparent" onPress={() => setSelectedIndex(null)} /> : null}

            {markers.map((marker, index) => {
              const x = xFor(marker.hour);
              const y = yFor(marker.energy);
              const isSelected = selectedIndex === index;

              return (
                <G key={`${marker.title}-${marker.hour}-${marker.completedAt.getTime()}`}>
                  {isSelected ? <Line x1={x} y1={PADDING.top} x2={x} y2={CHART_HEIGHT - PADDING.bottom} stroke={MARKER_COLOR} strokeWidth={1} strokeDasharray="3 3" opacity={0.6} /> : null}
                  <Circle cx={x} cy={y} r={HIT_RADIUS} fill="transparent" onPress={() => setSelectedIndex((current) => (current === index ? null : index))} />
                  <Circle cx={x} cy={y} r={isSelected ? 6 : 4.5} fill={MARKER_COLOR} stroke={isDark ? '#18181b' : '#ffffff'} strokeWidth={1.5} />
                </G>
              );
            })}

            {selectedMarker && selectedTooltip ? (
              <G>
                <Rect x={selectedTooltip.rectX} y={selectedTooltip.rectY} width={selectedTooltip.rectW} height={selectedTooltip.rectH} rx={6} fill={tooltipBg} stroke={tooltipBorder} strokeWidth={1} />
                <SvgText x={selectedTooltip.textX} y={selectedTooltip.rectY + TOOLTIP_PADDING_V + 10} fontSize={10} fontWeight="600" fill={labelColor} textAnchor={selectedTooltip.textAnchor}>
                  {selectedTooltip.title}
                </SvgText>
                <SvgText x={selectedTooltip.textX} y={selectedTooltip.rectY + TOOLTIP_PADDING_V + TOOLTIP_LINE_HEIGHT + 10} fontSize={9} fill={mutedColor} textAnchor={selectedTooltip.textAnchor}>
                  {selectedTooltip.time}
                </SvgText>
              </G>
            ) : null}
          </Svg>
        ) : (
          <View style={{ height: CHART_HEIGHT }} className="items-center justify-center">
            <Text className="text-center text-sm" style={{ color: mutedColor }}>
              Sem dados de energia para este dia
            </Text>
          </View>
        )}
      </View>

      {markers.length > 0 && (
        <View className="flex-row items-center gap-1.5 px-3 pb-2">
          <View className="size-2 rounded-full" style={{ backgroundColor: MARKER_COLOR }} />
          <Text className="text-xs" style={{ color: mutedColor }}>
            Tarefas concluídas
          </Text>
        </View>
      )}
    </View>
  );
}
