import { Activity, BedDouble, Brain, MoonStar, Sunrise } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import type { UseEnergyScoreResult } from '@/lib/energy';

const ACCENT = '#8b5cf6';
const IDEAL_SLEEP_HOURS = 8;

function formatHours(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function formatMinutes(minutes: number): string {
  return formatHours(minutes / 60);
}

function formatWakeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function SleepTile({ Icon, label, value, isDark }: { Icon: ComponentType<{ size?: number; color?: string }>; label: string; value: string | null; isDark: boolean }) {
  return (
    <View className="min-w-[47%] flex-1 rounded-xl bg-violet-500/5 px-3 py-2.5 dark:bg-white/5">
      <View className="flex-row items-center gap-1.5">
        <Icon size={15} color={isDark ? '#c4b5fd' : ACCENT} />
        <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</Text>
      </View>
      <Text className={`mt-1 text-base font-bold ${value ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500'}`}>{value ?? 'Indisponível'}</Text>
    </View>
  );
}

export default function SleepCard({ energyInfo, isDark }: { energyInfo: UseEnergyScoreResult; isDark: boolean }) {
  const { metrics, energy, loading, error } = energyInfo;

  const cardShadow = {
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.25 : 0.08,
    shadowRadius: 12,
    elevation: 4,
  } as const;

  const hasSleepData = metrics != null && (metrics.sleepHours != null || metrics.wakeTime != null || metrics.deepSleepMin != null || metrics.remSleepMin != null || metrics.sleepVariability != null);

  const header = (
    <View className="flex-row items-center gap-2.5">
      <View className="size-9 items-center justify-center rounded-full bg-violet-500/15">
        <MoonStar size={18} color={isDark ? '#c4b5fd' : ACCENT} />
      </View>
      <Text className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">Sono</Text>
    </View>
  );

  if (loading && !hasSleepData) {
    return (
      <View className="rounded-2xl bg-white p-4 dark:bg-white/10" style={cardShadow}>
        {header}
        <View className="items-center py-6">
          <ActivityIndicator color={isDark ? '#c4b5fd' : ACCENT} />
        </View>
      </View>
    );
  }

  if (!hasSleepData) {
    return (
      <View className="rounded-2xl bg-white p-4 dark:bg-white/10" style={cardShadow}>
        {header}
        <View className="items-center px-4 py-6">
          <Text className="text-center text-base font-semibold text-zinc-700 dark:text-zinc-200">Informações de sono não disponíveis</Text>
          <Text className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">Não encontramos dados de sono recentes no app de saúde do seu aparelho.</Text>
          {error != null && <Text className="mt-2 text-center text-[10px] text-red-400">{error.message}</Text>}
        </View>
      </View>
    );
  }

  const sleepQuality = energy?.breakdown.find((sub) => sub.key === 'sleepHours');
  const sleepPercent = metrics.sleepHours != null ? Math.max(0, Math.min(100, (metrics.sleepHours / IDEAL_SLEEP_HOURS) * 100)) : null;

  return (
    <View className="rounded-2xl bg-white p-4 dark:bg-white/10" style={cardShadow}>
      <View className="flex-row items-center justify-between">
        {header}
        {sleepQuality?.available ? (
          <View className="rounded-full bg-violet-500/15 px-3 py-1">
            <Text className="text-xs font-bold" style={{ color: isDark ? '#c4b5fd' : ACCENT }}>
              Qualidade {Math.round(sleepQuality.value)}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mt-4">
        <View className="flex-row items-end justify-between">
          <Text className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">{metrics.sleepHours != null ? formatHours(metrics.sleepHours) : '—'}</Text>
          <Text className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Meta: {IDEAL_SLEEP_HOURS}h</Text>
        </View>

        {sleepPercent != null && (
          <View className="mt-2 h-2 overflow-hidden rounded-full bg-violet-500/10 dark:bg-white/10">
            <View className="h-full rounded-full" style={{ width: `${sleepPercent}%`, backgroundColor: ACCENT }} />
          </View>
        )}
      </View>

      <View className="mt-4 flex-row flex-wrap" style={{ gap: 8 }}>
        <SleepTile Icon={Sunrise} label="Despertar" value={metrics.wakeTime != null ? formatWakeTime(metrics.wakeTime) : null} isDark={isDark} />
        <SleepTile Icon={BedDouble} label="Sono profundo" value={metrics.deepSleepMin != null ? formatMinutes(metrics.deepSleepMin) : null} isDark={isDark} />
        <SleepTile Icon={Brain} label="Sono REM" value={metrics.remSleepMin != null ? formatMinutes(metrics.remSleepMin) : null} isDark={isDark} />
        <SleepTile Icon={Activity} label="Regularidade" value={metrics.sleepVariability != null ? `± ${formatHours(metrics.sleepVariability)}` : null} isDark={isDark} />
      </View>
    </View>
  );
}
