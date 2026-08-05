import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import PeakEnergyCard from '@/components/PeakEnergyCard';
import { toLocalISOString } from '@/lib/date';
import { computeEnergyAtMoment, findPeakWindow, type FlowlyEngineInput, flowlyInputFromMetrics, formatPeakWindowLabel, generateEnergyCurve, getHealthProvider } from '@/lib/energy';
import { applySleepProfile, useSleepProfile } from '@/lib/sleepProfile';

import type { EnergyPreviewStep as EnergyPreviewStepData } from '../data';
import NavFooter from './NavFooter';
import StepShell from './StepShell';

type EnergyPreviewStepProps = {
  step: EnergyPreviewStepData;
  isDark: boolean;
  onNext: () => void;
};

/**
 * Preview da curva de energia logo após o perfil de sono — o "aha" antes do paywall.
 */
export default function EnergyPreviewStep({ step, isDark, onNext }: EnergyPreviewStepProps) {
  const { profile } = useSleepProfile();
  const [input, setInput] = useState<FlowlyEngineInput | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const collected = await getHealthProvider().collect();
        const metrics = applySleepProfile(collected, profile);
        const engineInput = flowlyInputFromMetrics(metrics, 8);
        const now = computeEnergyAtMoment(engineInput, toLocalISOString());
        if (!active) return;
        setInput(engineInput);
        setScore(now.doubleEnergyScore);
      } catch {
        if (!active) return;
        setInput(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [profile]);

  const peakLabel = useMemo(() => {
    if (!input) return null;
    const curve = generateEnergyCurve(input, undefined, { stepMinutes: 30 });
    return formatPeakWindowLabel(findPeakWindow(curve));
  }, [input]);

  return (
    <StepShell icon={step.icon} title={step.title} subtitle={step.subtitle} isDark={isDark}>
      <View className="mt-2 flex-1">
        {loading ? (
          <View className="items-center justify-center py-10">
            <ActivityIndicator color="#6366f1" />
          </View>
        ) : (
          <>
            <PeakEnergyCard
              input={input}
              currentScore={score}
              isDark={isDark}
              title="Sua curva de energia"
              subtitle={peakLabel ? `Com base no seu sono, seu pico é ${peakLabel} — é aí que o Flowly vai colocar o que mais importa.` : 'Assim que o sono estiver configurado, mostramos seu pico do dia.'}
            />
            <Text className="mt-4 text-center text-sm leading-5 text-zinc-500 dark:text-zinc-400">Nem todo dia é 100% — e tudo bem. O Flowly reorganiza suas atividades conforme a sua energia real.</Text>
          </>
        )}
      </View>

      <NavFooter label={step.ctaLabel} onPress={onNext} />
    </StepShell>
  );
}
