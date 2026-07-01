import * as Sentry from '@sentry/react-native';
import type { LucideIcon } from 'lucide-react-native';
import { CircleCheck, Moon, Sunrise, Watch } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import TimeStepper from '@/components/TimeStepper';
import { getHealthProvider } from '@/lib/energy';
import { DEFAULT_BED_TIME, DEFAULT_WAKE_TIME, useSleepProfile } from '@/lib/sleepProfile';

import type { SleepProfileStep as SleepProfileStepData } from '../data';
import NavFooter from './NavFooter';
import StepShell from './StepShell';

const ACCENT = '#6366f1';

type Phase = 'device' | 'checking' | 'found' | 'manual';

type SleepProfileStepProps = {
  step: SleepProfileStepData;
  isDark: boolean;
  onNext: () => void;
};

function OptionCard({ title, description, Icon, isDark, onPress }: { title: string; description: string; Icon: LucideIcon; isDark: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center rounded-2xl border p-4 active:opacity-70"
      style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)' }}
    >
      <View className="size-11 items-center justify-center rounded-xl" style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)' }}>
        <Icon size={20} color={ACCENT} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">{title}</Text>
        <Text className="mt-0.5 text-sm leading-5 text-zinc-500 dark:text-zinc-400">{description}</Text>
      </View>
    </Pressable>
  );
}

/**
 * Passo de perfil de sono do onboarding:
 * 1. pergunta se o usuário tem dispositivo que monitora o sono;
 * 2. se tem, pede a permissão de saúde e valida se há horários de dormir/acordar;
 * 3. sem dispositivo (ou sem dados), coleta o horário usual de acordar/dormir —
 *    o fallback que mantém o Energy Score funcional sem wearable.
 */
export default function SleepProfileStep({ step, isDark, onNext }: SleepProfileStepProps) {
  const { setHasDevice, setUsualTimes } = useSleepProfile();
  const [phase, setPhase] = useState<Phase>('device');
  const [noticeText, setNoticeText] = useState<string | null>(null);
  const [wakeTime, setWakeTime] = useState(DEFAULT_WAKE_TIME);
  const [bedTime, setBedTime] = useState(DEFAULT_BED_TIME);

  const handleHasDevice = async () => {
    setHasDevice(true);
    setPhase('checking');
    try {
      const provider = getHealthProvider();
      const available = await provider.isAvailable();
      if (!available) {
        setNoticeText('O app de saúde não está disponível neste aparelho. Sem problema: informe seus horários abaixo.');
        setPhase('manual');
        return;
      }

      await provider.requestPermissions();
      const metrics = await provider.collect();

      // Valida se a saúde realmente trouxe os horários de dormir e acordar.
      if (metrics.wakeTime && metrics.bedTime) {
        setPhase('found');
        return;
      }

      setNoticeText('Permissão concedida, mas ainda não encontramos registros de sono. Informe seus horários abaixo — os dados do dispositivo passam a valer assim que aparecerem.');
      setPhase('manual');
    } catch (error) {
      Sentry.captureException(error);
      setNoticeText('Não conseguimos acessar seus dados de saúde. Informe seus horários abaixo para calcular sua energia mesmo assim.');
      setPhase('manual');
    }
  };

  const handleNoDevice = () => {
    setHasDevice(false);
    setNoticeText(null);
    setPhase('manual');
  };

  const handleSaveManual = () => {
    setUsualTimes({ wakeTime, bedTime });
    onNext();
  };

  if (phase === 'checking') {
    return (
      <StepShell icon={step.icon} title={step.title} subtitle="Verificando seus dados de sono..." isDark={isDark}>
        <View className="items-center py-10">
          <ActivityIndicator color={ACCENT} />
        </View>
      </StepShell>
    );
  }

  if (phase === 'found') {
    return (
      <StepShell icon={step.icon} title="Dados de sono encontrados!" subtitle="Encontramos seus horários de dormir e acordar no app de saúde. Sua energia será calculada com os dados reais do seu dispositivo." isDark={isDark}>
        <View className="items-center rounded-2xl border p-6" style={{ borderColor: isDark ? 'rgba(34,197,94,0.35)' : 'rgba(34,197,94,0.25)', backgroundColor: isDark ? 'rgba(34,197,94,0.10)' : 'rgba(34,197,94,0.08)' }}>
          <CircleCheck size={32} color="#22c55e" />
          <Text className="mt-3 text-center text-[15px] font-semibold text-zinc-800 dark:text-zinc-100">Tudo pronto para calcular sua energia</Text>
        </View>

        <NavFooter label="Continuar" onPress={onNext} />
      </StepShell>
    );
  }

  if (phase === 'manual') {
    return (
      <StepShell icon={step.icon} title="Seus horários de sono" subtitle="Informe seus horários usuais — dá para ajustar depois em Estatísticas, no card de Sono." isDark={isDark}>
        {noticeText ? (
          <View className="mb-4 rounded-2xl border p-3.5" style={{ borderColor: isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.25)', backgroundColor: isDark ? 'rgba(99,102,241,0.10)' : 'rgba(99,102,241,0.07)' }}>
            <Text className="text-sm leading-5 text-zinc-600 dark:text-zinc-300">{noticeText}</Text>
          </View>
        ) : null}

        <View className="gap-3">
          <TimeStepper label="Acordo às" Icon={Sunrise} value={wakeTime} onChange={setWakeTime} isDark={isDark} />
          <TimeStepper label="Durmo às" Icon={Moon} value={bedTime} onChange={setBedTime} isDark={isDark} />
        </View>

        <NavFooter label="Salvar e continuar" skipLabel={step.skipLabel} onPress={handleSaveManual} onSkip={onNext} />
      </StepShell>
    );
  }

  return (
    <StepShell icon={step.icon} title={step.title} subtitle={step.subtitle} isDark={isDark}>
      <Text className="mb-3 text-[15px] font-semibold text-zinc-800 dark:text-zinc-100">Você usa um dispositivo que monitora seu sono?</Text>

      <View className="gap-3">
        <OptionCard title="Sim, uso" description="Apple Watch, smartband ou outro app de sono. Vamos ler seus dados de saúde." Icon={Watch} isDark={isDark} onPress={handleHasDevice} />
        <OptionCard title="Não uso" description="Sem problema: você informa seus horários e calculamos sua energia do mesmo jeito." Icon={Sunrise} isDark={isDark} onPress={handleNoDevice} />
      </View>

      <Pressable onPress={onNext} accessibilityRole="button" className="mt-4 items-center py-2 active:opacity-70">
        <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{step.skipLabel}</Text>
      </Pressable>
    </StepShell>
  );
}
