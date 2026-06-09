import { BatteryFull, CheckCircle, HandFist } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, useColorScheme, View } from 'react-native';

import { useEnergyScore } from '@/lib/energy';

import DayChip from './components/DayChip';
import ProgressRing from './components/ProgressRing';
import StatCard from './components/StatsCard';
import { fetchProgress } from './data';
import type { ProgressData } from './types';

export default function Statistics() {
  const isDark = useColorScheme() === 'dark';
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const energyInfo = useEnergyScore();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchProgress(selectedDay ?? undefined)
      .then((response: any) => {
        if (active) {
          setData(response);

          if (!selectedDay || selectedDay !== response.selectedDay) {
            setSelectedDay(response.selectedDay);
          }
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedDay]);

  if (loading || !data) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={isDark ? '#e4e4e7' : '#3b82f6'} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScrollView className="mt-4 flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <View className="flex-row items-center justify-between">
          {data.days.map((day) => (
            <DayChip key={day.date} day={day} onPress={() => setSelectedDay(day.date)} />
          ))}
        </View>

        <View className="mt-7 flex-row items-center justify-between">
          <View className="flex-1 gap-2">
            <View className="min-w-full flex-1 rounded-2xl bg-white/40 px-4 py-2 pr-3">
              <Text className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">Tarefas concluídas</Text>

              <View className="gap-2] flex-row items-center">
                <CheckCircle size={24} color={isDark ? '#e4e4e7' : '#3b82f6'} />
                <Text className="ml-2 text-xl font-extrabold text-zinc-900 dark:text-zinc-50">{data.daily.concludedTasks}</Text>
              </View>
            </View>

            <View className="min-w-full flex-1 rounded-2xl bg-white/40 px-4 py-2 pr-3">
              <Text className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">Energia Restante</Text>
              <View className="flex-row items-center gap-2">
                <BatteryFull size={24} color={isDark ? '#e4e4e7' : '#3b82f6'} />
                <Text className="ml-2 text-xl font-extrabold text-zinc-900 dark:text-zinc-50">{energyInfo.score ?? 0}%</Text>
              </View>
            </View>

            <View className="min-w-full flex-1 rounded-2xl bg-white/40 px-4 py-2 pr-3">
              <Text className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">Pontos de Impacto</Text>
              <View className="flex-row items-center gap-2">
                <HandFist size={24} color={isDark ? '#e4e4e7' : '#3b82f6'} />
                <Text className="ml-2 text-xl font-extrabold text-zinc-900 dark:text-zinc-50">{data.impactScore}</Text>
              </View>
            </View>
          </View>

          <ProgressRing percent={data.daily.percent} isDark={isDark} />
        </View>

        <View className="mt-7 flex-row" style={{ gap: 10 }}>
          {data.stats.map((stat) => (
            <StatCard key={stat.id} stat={stat} isDark={isDark} />
          ))}
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
