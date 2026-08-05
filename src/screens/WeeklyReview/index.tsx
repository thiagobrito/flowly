import { useQuery } from '@tanstack/react-query';
import { Share2, Zap } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import ModalScreen from '@/components/ModalScreen';
import { localDateKey, startOfLocalDay, toLocalISOString } from '@/lib/date';
import type { FlowlyEngineInput } from '@/lib/energy';
import { findPeakWindow, flowlyInputFromMetrics, formatPeakWindowLabel, generateEnergyCurve, getHealthProvider } from '@/lib/energy';
import { api } from '@/lib/network';
import { queryKeys } from '@/lib/query';
import { shareViewAsImage } from '@/lib/share';
import type { SleepProfile } from '@/lib/sleepProfile';
import { applySleepProfile, useSleepProfile } from '@/lib/sleepProfile';
import { track } from '@/lib/telemetry';
import { ACCENT, ENERGY, mutedText } from '@/lib/theme';
import { averageDayEnergy, dayInputFor, weekDateKeys } from '@/lib/weeklyReview';

type WeeklyReviewProps = {
  visible: boolean;
  onClose: () => void;
};

type DayDigest = {
  dateKey: string;
  label: string;
  concluded: number;
  total: number;
  percent: number;
  energyAvg: number;
  areaPoints: Record<string, number>;
};

const AREA_COLORS = [ACCENT, ENERGY.high, ENERGY.medium, '#ec4899', '#06b6d4', '#a855f7'];

function weekdayLabel(dateKey: string): string {
  const date = startOfLocalDay(dateKey);
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

async function fetchDayDigest(dateKey: string, energyInput: FlowlyEngineInput | null): Promise<DayDigest> {
  const response = (await api.get<any>('/report', { params: { date: toLocalISOString(startOfLocalDay(dateKey)) } })) as any;
  const progress = response?.data ?? response?.progress ?? response;
  const concluded = progress?.completedCount ?? progress?.concludedTasks?.length ?? 0;
  const total = progress?.totalTasks ?? concluded + (progress?.visibleTasks?.length ?? 0);
  const percent = progress?.percent ?? (total > 0 ? Math.round((concluded / total) * 100) : 0);

  const areaPoints: Record<string, number> = {};
  for (const stat of progress?.stats ?? []) {
    if (stat.area) areaPoints[stat.area] = Number(stat.value) || 0;
  }

  return {
    dateKey,
    label: weekdayLabel(dateKey),
    concluded,
    total,
    percent,
    // Cada dia usa a própria noite e o histórico até ali; sem reancorar, os
    // sete dias exibiriam a energia de hoje.
    energyAvg: averageDayEnergy(dayInputFor(energyInput, dateKey)),
    areaPoints,
  };
}

function BalancePie({ segments }: { segments: Array<{ label: string; value: number; color: string }> }) {
  const size = 140;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, item) => sum + item.value, 0) || 1;

  let offset = 0;
  return (
    <View className="items-center">
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          {segments.map((segment) => {
            const length = (segment.value / total) * circumference;
            const circle = (
              <Circle key={segment.label} cx={size / 2} cy={size / 2} r={radius} stroke={segment.color} strokeWidth={stroke} fill="transparent" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} strokeLinecap="butt" />
            );
            offset += length;
            return circle;
          })}
        </G>
      </Svg>
    </View>
  );
}

/** Coleta saúde + perfil de sono e devolve o input do motor para hoje. */
async function fetchEnergyInput(profile: SleepProfile | null): Promise<FlowlyEngineInput> {
  const collected = await getHealthProvider().collect();
  return flowlyInputFromMetrics(applySleepProfile(collected, profile), 8);
}

export default function WeeklyReview({ visible, onClose }: WeeklyReviewProps) {
  const isDark = useColorScheme() === 'dark';
  const { profile } = useSleepProfile();

  // Só busca com o modal aberto: a revisão é uma tela de destino, não vale
  // rodar a coleta de saúde e sete requisições enquanto ela está fechada.
  const energyQuery = useQuery({
    queryKey: queryKeys.weeklyReviewEnergy(profile),
    queryFn: () => fetchEnergyInput(profile),
    enabled: visible,
  });

  const energyInput = energyQuery.data ?? null;

  const digestsQuery = useQuery({
    queryKey: queryKeys.weeklyReviewDigest(localDateKey(), energyInput?.wakeTime ?? null),
    queryFn: () => Promise.all(weekDateKeys().map((key) => fetchDayDigest(key, energyInput))),
    enabled: visible && energyQuery.isSuccess,
  });

  const days = useMemo(() => digestsQuery.data ?? [], [digestsQuery.data]);
  const loading = energyQuery.isLoading || digestsQuery.isLoading;

  const peakLabel = useMemo(() => {
    if (!energyInput) return null;
    return formatPeakWindowLabel(findPeakWindow(generateEnergyCurve(energyInput, undefined, { stepMinutes: 30 })));
  }, [energyInput]);

  const summary = useMemo(() => {
    const concluded = days.reduce((sum, day) => sum + day.concluded, 0);
    const energyDays = days.filter((day) => day.energyAvg > 0);
    const energyAvg = energyDays.length > 0 ? Math.round(energyDays.reduce((sum, day) => sum + day.energyAvg, 0) / energyDays.length) : 0;
    const strongest = [...days].sort((a, b) => b.percent - a.percent || b.concluded - a.concluded)[0] ?? null;

    const areaTotals: Record<string, number> = {};
    for (const day of days) {
      for (const [area, points] of Object.entries(day.areaPoints)) {
        areaTotals[area] = (areaTotals[area] ?? 0) + points;
      }
    }
    const segments = Object.entries(areaTotals)
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], index) => ({
        label,
        value,
        color: AREA_COLORS[index % AREA_COLORS.length]!,
      }));

    return { concluded, energyAvg, strongest, segments };
  }, [days]);

  const muted = mutedText(isDark);

  const summaryRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    setSharing(true);
    const status = await shareViewAsImage(summaryRef.current, {
      dialogTitle: 'Minha semana no Flowly',
      fileName: `flowly-semana-${localDateKey()}`,
    });
    setSharing(false);

    if (status === 'shared') {
      track('peak_score_shared', { surface: 'weekly_review', energyAvg: summary.energyAvg, concluded: summary.concluded });
      return;
    }

    Alert.alert('Não foi possível compartilhar', status === 'unavailable' ? 'Este dispositivo não oferece compartilhamento.' : 'Tente novamente em instantes.');
  }, [summary.concluded, summary.energyAvg]);

  return (
    <ModalScreen visible={visible} onClose={onClose} title="Revisão semanal" isDark={isDark} backgroundColor={isDark ? '#09090b' : '#f4f4f5'}>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : (
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Recorte capturado no compartilhamento. `collapsable={false}` mantém a
              View nativa viva no Android, sem ela o captureRef volta vazio. */}
          <View ref={summaryRef} collapsable={false} style={{ backgroundColor: isDark ? '#09090b' : '#f4f4f5' }}>
            <View
              className="mb-3 rounded-2xl border px-4 py-3"
              style={{
                borderColor: isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.25)',
                backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
              }}
            >
              <View className="flex-row items-center">
                <Zap size={16} color={ACCENT} />
                <Text className="ml-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>
                  Energia média da semana
                </Text>
              </View>
              <Text className="mt-1 text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{summary.energyAvg || '—'}</Text>
              <Text className="mt-0.5 text-sm" style={{ color: muted }}>
                {peakLabel ? `Pico típico ${peakLabel}` : 'Configure o sono para ver o pico'}
              </Text>
            </View>

            <View className="mb-3 flex-row" style={{ gap: 8 }}>
              <View className="flex-1 rounded-2xl bg-white p-3 dark:bg-white/10">
                <Text className="text-[11px] font-semibold uppercase" style={{ color: muted }}>
                  Concluídas
                </Text>
                <Text className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{summary.concluded}</Text>
              </View>
              <View className="flex-1 rounded-2xl bg-white p-3 dark:bg-white/10">
                <Text className="text-[11px] font-semibold uppercase" style={{ color: muted }}>
                  Dia mais forte
                </Text>
                <Text className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">{summary.strongest ? summary.strongest.label : '—'}</Text>
                {summary.strongest ? (
                  <Text className="text-xs" style={{ color: muted }}>
                    {summary.strongest.percent}% do dia
                  </Text>
                ) : null}
              </View>
            </View>

            {summary.segments.length > 0 ? (
              <View className="mb-3 rounded-2xl bg-white p-4 dark:bg-white/10">
                <Text className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Equilíbrio da semana</Text>
                <View className="flex-row items-center">
                  <BalancePie segments={summary.segments} />
                  <View className="ml-4 flex-1">
                    {summary.segments.map((segment) => (
                      <View key={segment.label} className="mb-1.5 flex-row items-center">
                        <View className="mr-2 size-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                        <Text className="flex-1 text-sm capitalize text-zinc-700 dark:text-zinc-200">{segment.label}</Text>
                        <Text className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">{segment.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={handleShare}
            disabled={sharing}
            accessibilityRole="button"
            accessibilityLabel="Compartilhar resumo da semana"
            accessibilityState={{ disabled: sharing }}
            className="mb-4 flex-row items-center justify-center rounded-2xl py-3 active:opacity-80"
            style={{ backgroundColor: ACCENT, opacity: sharing ? 0.6 : 1 }}
          >
            {sharing ? <ActivityIndicator color="#ffffff" /> : <Share2 size={16} color="#ffffff" />}
            <Text className="ml-2 text-sm font-semibold text-white">{sharing ? 'Gerando imagem…' : 'Compartilhar resumo'}</Text>
          </Pressable>

          <Text className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Últimos 7 dias</Text>
          {days.map((day) => (
            <View key={day.dateKey} className="mb-2 flex-row items-center justify-between rounded-xl bg-white px-3 py-2.5 dark:bg-white/10">
              <View>
                <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{day.label}</Text>
                <Text className="text-xs" style={{ color: muted }}>
                  {day.concluded}/{day.total} atividades · energia {day.energyAvg || '—'}
                </Text>
              </View>
              <Text className="text-base font-semibold tabular-nums" style={{ color: ACCENT }}>
                {day.percent}%
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </ModalScreen>
  );
}
