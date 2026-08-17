/**
 * Prévia da curva de energia dentro do próprio passo de sono.
 *
 * As métricas de saúde são coletadas uma vez; os horários informados entram
 * como override do dia, que vence dos dados coletados. Assim cada toque no
 * TimeStepper redesenha a curva na hora, sem uma ida ao provider por toque —
 * é essa resposta imediata que faz o usuário entender que o horário de sono é
 * o que move o gráfico.
 */

import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import PeakEnergyCard from '@/components/PeakEnergyCard';
import { localDateKey, toLocalISOString } from '@/lib/date';
import { computeEnergyAtMoment, type FlowlyEngineInput, flowlyInputFromMetrics, getHealthProvider, type HealthMetrics } from '@/lib/energy';
import { applySleepProfile } from '@/lib/sleepProfile';
import { accentOn } from '@/lib/theme';

type SleepEnergyPreviewProps = {
  /** Horário de dormir "HH:MM". */
  bedTime: string;
  /** Horário de acordar "HH:MM". */
  wakeTime: string;
  isDark: boolean;
};

export default function SleepEnergyPreview({ bedTime, wakeTime, isDark }: SleepEnergyPreviewProps) {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const collected = await getHealthProvider().collect();
        if (active) setMetrics(collected);
      } catch {
        if (active) setMetrics(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const { input, score } = useMemo<{ input: FlowlyEngineInput | null; score: number }>(() => {
    if (!metrics) return { input: null, score: 0 };

    const withSleep = applySleepProfile(metrics, { overrides: { [localDateKey()]: { wakeTime, bedTime } } });
    const engineInput = flowlyInputFromMetrics(withSleep, 8);
    return { input: engineInput, score: computeEnergyAtMoment(engineInput, toLocalISOString()).doubleEnergyScore };
  }, [metrics, wakeTime, bedTime]);

  if (loading) {
    return (
      <View className="items-center justify-center py-10">
        <ActivityIndicator color={accentOn(isDark)} />
      </View>
    );
  }

  return <PeakEnergyCard input={input} currentScore={score} isDark={isDark} title="Sua curva de energia" subtitle="É assim que seu dia se distribui. O Flowly encaixa o que mais importa na sua melhor janela." />;
}
