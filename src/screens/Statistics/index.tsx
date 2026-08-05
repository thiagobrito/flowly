import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { BatteryFull, CalendarRange, CheckCircle, HandFist } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, useColorScheme, View } from 'react-native';

import { startOfLocalDay, toLocalISOString } from '@/lib/date';
import { flowlyInputFromMetrics, lastDaysRange, useEnergyScore } from '@/lib/energy';
import { queryKeys } from '@/lib/query';

import ConcludedTasksTable from './components/ConcludedTasksTable';
import DayChip from './components/DayChip';
import EnergyDayChart from './components/EnergyDayChart';
import ProgressRing from './components/ProgressRing';
import SleepCard from './components/SleepCard';
import StatCard from './components/StatsCard';
import { fetchProgress } from './data';
import type { ProgressData } from './types';

type StatisticsProps = {
  autoOpenSleep?: boolean;
  onSleepPromptHandled?: () => void;
  onOpenWeeklyReview?: () => void;
};

export default function Statistics({ autoOpenSleep, onSleepPromptHandled, onOpenWeeklyReview }: StatisticsProps = {}) {
  const isDark = useColorScheme() === 'dark';
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>(() => toLocalISOString());

  // `keepPreviousData` evita a tela em branco ao trocar de dia: os dados
  // anteriores continuam visíveis enquanto o novo dia é carregado.
  const reportQuery = useQuery<ProgressData>({
    queryKey: queryKeys.report(selectedDay),
    queryFn: () => fetchProgress(selectedDay),
    placeholderData: keepPreviousData,
  });
  const data = reportQuery.data ?? null;

  const energyRange = useMemo(() => {
    const dayStart = startOfLocalDay(selectedDay);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    return lastDaysRange(1, dayEnd);
  }, [selectedDay]);

  const energyInfo = useEnergyScore({ range: energyRange });
  const { refresh: refreshEnergy } = energyInfo;

  const flowlyInput = useMemo(() => {
    if (!energyInfo.metrics) return null;
    return flowlyInputFromMetrics(energyInfo.metrics, 8);
  }, [energyInfo.metrics]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.report(selectedDay) }), refreshEnergy()]);
    } catch {
      Alert.alert('Erro', 'Não foi possível recarregar as estatísticas.');
    } finally {
      setRefreshing(false);
    }
  }, [selectedDay, refreshEnergy, queryClient]);

  if (reportQuery.isLoading || !data) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={isDark ? '#e4e4e7' : '#3b82f6'} />
      </View>
    );
  }

  const { stats } = data;
  const statsMultiLine = stats.length > 3;

  return (
    <View className="flex-1">
      <ScrollView
        className="mt-4 flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#e4e4e7' : '#3b82f6'} colors={['#3b82f6']} />}
      >
        <View className="flex-row items-center justify-between">
          {data.days.map((day) => (
            <DayChip key={day.date} day={day} onPress={() => setSelectedDay(day.date)} />
          ))}
        </View>

        {onOpenWeeklyReview ? (
          <Pressable
            onPress={onOpenWeeklyReview}
            accessibilityRole="button"
            accessibilityLabel="Abrir revisão semanal"
            className="mt-4 flex-row items-center justify-center rounded-2xl border px-4 py-3 active:opacity-80"
            style={{
              borderColor: isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.25)',
              backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
            }}
          >
            <CalendarRange size={16} color="#6366f1" />
            <Text className="ml-2 text-sm font-semibold" style={{ color: '#6366f1' }}>
              Ver revisão semanal
            </Text>
          </Pressable>
        ) : null}

        <View className="mt-7 flex-row items-center justify-between">
          <View className="flex-1 gap-2">
            <View className="min-w-full flex-1 rounded-2xl bg-white px-4 py-2 pr-3 dark:bg-white/10">
              <Text className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">Tarefas concluídas</Text>

              <View className="flex-row items-center gap-2">
                <CheckCircle size={24} color={isDark ? '#e4e4e7' : '#3b82f6'} />
                <Text className="ml-2 text-xl font-extrabold text-zinc-900 dark:text-zinc-50">{data.daily.concludedTasks}</Text>
              </View>
            </View>

            <View className="min-w-full flex-1 rounded-2xl bg-white px-4 py-2 pr-3 dark:bg-white/10">
              <Text className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">Pontos de Energia</Text>
              <View className="flex-row items-center gap-2">
                <BatteryFull size={24} color={isDark ? '#e4e4e7' : '#3b82f6'} />
                <Text className="ml-2 text-xl font-extrabold text-zinc-900 dark:text-zinc-50">{data.energyScore}</Text>
              </View>
            </View>

            <View className="min-w-full flex-1 rounded-2xl bg-white px-4 py-2 pr-3 dark:bg-white/10">
              <Text className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">Pontos de Impacto</Text>
              <View className="flex-row items-center gap-2">
                <HandFist size={24} color={isDark ? '#e4e4e7' : '#3b82f6'} />
                <Text className="ml-2 text-xl font-extrabold text-zinc-900 dark:text-zinc-50">{data.impactScore}</Text>
              </View>
            </View>
          </View>

          <ProgressRing totalScore={data.totalScore} averageFromLast7Days={data.averageFromLast7Days} isDark={isDark} />
        </View>

        <View className={`mt-7 flex-row${statsMultiLine ? ' flex-wrap' : ''}`} style={{ gap: 10 }}>
          {stats.map((stat) => (
            <View key={stat.id} className={statsMultiLine ? 'w-[31%]' : 'flex-1'}>
              <StatCard stat={stat} isDark={isDark} />
            </View>
          ))}
        </View>

        <View className="mt-7">
          <SleepCard energyInfo={energyInfo} isDark={isDark} selectedDay={selectedDay} autoOpenEdit={autoOpenSleep} onAutoOpenHandled={onSleepPromptHandled} />
        </View>

        <View className="mt-7">
          <EnergyDayChart input={flowlyInput} tasks={data.concludedTasks ?? []} selectedDay={selectedDay} isDark={isDark} />
        </View>

        <View className="mt-7">
          <ConcludedTasksTable tasks={data.concludedTasks ?? []} isDark={isDark} />
        </View>

        {/* }
        <View className="mt-7 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Estatísticas</Text>
        </View>

        <View className="mt-4 flex-row" style={{ gap: 12 }}>
          {data.metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} isDark={isDark} />
          ))}
        </View>
        */}
      </ScrollView>
    </View>
  );
}
