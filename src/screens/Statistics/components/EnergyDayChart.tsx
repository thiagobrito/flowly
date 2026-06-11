import { Zap } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { startOfLocalDay } from '@/lib/date';
import { computeEnergyAtMoment, type FlowlyEngineInput } from '@/lib/energy';

import type { Task } from '../../NewTask/data';

const ACCENT = '#3b82f6';
const MARKER_COLOR = '#22c55e';

const CHART_HEIGHT = 220;
const PADDING = { top: 34, right: 14, bottom: 26, left: 30 } as const;
const HOURS_IN_DAY = 24;

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

function markerTextAnchor(x: number, width: number): TextAnchor {
  if (x < PADDING.left + 40) return 'start';
  if (x > width - PADDING.right - 40) return 'end';
  return 'middle';
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

  const mutedColor = isDark ? '#a1a1aa' : '#71717a';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const labelColor = isDark ? '#e4e4e7' : '#3f3f46';

  const day = useMemo(() => startOfLocalDay(selectedDay), [selectedDay]);

  const { curve, markers } = useMemo(() => {
    if (!input) return { curve: [] as number[], markers: [] as TaskMarker[] };

    const dayInput = anchorInputToDay(input, day);

    const energyAt = (hourFraction: number): number => {
      const moment = new Date(day.getTime() + hourFraction * 3600_000);
      return computeEnergyAtMoment(dayInput, moment.toISOString()).doubleEnergyScore;
    };

    const hourly = Array.from({ length: HOURS_IN_DAY + 1 }, (_, hour) => energyAt(hour));

    const taskMarkers: TaskMarker[] = tasks
      .flatMap((task) =>
        (task.completed ?? [])
          .map((iso) => new Date(iso))
          .filter((date) => !Number.isNaN(date.getTime()) && isSameLocalDay(date, day))
          .map((date) => {
            const hour = date.getHours() + date.getMinutes() / 60;
            return { title: task.name, hour, energy: energyAt(hour) };
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

            {markers.map((marker, index) => {
              const x = xFor(marker.hour);
              const y = yFor(marker.energy);
              // Alterna a altura dos rótulos para reduzir sobreposição.
              const labelY = Math.max(10, y - 12 - (index % 2) * 12);
              const title = marker.title.length > 18 ? `${marker.title.slice(0, 17)}…` : marker.title;
              const anchor = markerTextAnchor(x, width);

              return (
                <G key={`${marker.title}-${marker.hour}`}>
                  <Line x1={x} y1={y} x2={x} y2={CHART_HEIGHT - PADDING.bottom} stroke={MARKER_COLOR} strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
                  <Circle cx={x} cy={y} r={4.5} fill={MARKER_COLOR} stroke={isDark ? '#18181b' : '#ffffff'} strokeWidth={1.5} />
                  <SvgText x={x} y={labelY} fontSize={9} fontWeight="600" fill={labelColor} textAnchor={anchor}>
                    {title}
                  </SvgText>
                </G>
              );
            })}
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
