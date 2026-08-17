import * as Sentry from '@sentry/react-native';
import type { LucideIcon } from 'lucide-react-native';
import { CircleCheck, Heart, Moon, Sunrise, Watch } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import TimeStepper from '@/components/TimeStepper';
import { getHealthProvider } from '@/lib/energy';
import { DEFAULT_BED_TIME, DEFAULT_WAKE_TIME, isoToTimeString, useSleepProfile } from '@/lib/sleepProfile';
import { ACCENT, accentOn, energyBorder, energySurface, energyText, surface } from '@/lib/theme';

import type { SleepProfileStep as SleepProfileStepData } from '../data';
import NavFooter from './NavFooter';
import SleepEnergyPreview from './SleepEnergyPreview';
import StepShell from './StepShell';

type Phase = 'device' | 'checking' | 'found' | 'manual';

type SleepProfileStepProps = {
  step: SleepProfileStepData;
  isDark: boolean;
  onNext: () => void;
};

function OptionCard({ title, description, Icon, isDark, onPress }: { title: string; description: string; Icon: LucideIcon; isDark: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="flex-row items-center rounded-2xl border p-4 active:opacity-70" style={{ borderColor: surface.border(isDark), backgroundColor: surface.card(isDark) }}>
      <View className="size-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${ACCENT}${isDark ? '2e' : '1f'}` }}>
        <Icon size={20} color={accentOn(isDark)} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">{title}</Text>
        <Text className="mt-0.5 text-sm leading-5 text-zinc-500 dark:text-zinc-400">{description}</Text>
      </View>
    </Pressable>
  );
}

/**
 * O básico basta. Quem chega aqui sem wearable precisa ouvir que informar dois
 * horários não é o plano B — é o plano que funciona.
 */
function ReassuranceCard({ isDark }: { isDark: boolean }) {
  return (
    <View className="mt-4 flex-row items-center rounded-2xl border p-3.5" style={{ borderColor: surface.border(isDark), backgroundColor: surface.subtle(isDark) }}>
      <Heart size={18} color={energyText('low', isDark)} />
      <Text className="ml-3 flex-1 text-sm leading-5 text-zinc-600 dark:text-zinc-300">Você não precisa de nada além do básico. Dois horários já bastam para o Flowly calcular sua energia.</Text>
    </View>
  );
}

/**
 * Passo de perfil de sono do onboarding:
 * 1. pergunta se o usuário tem dispositivo que monitora o sono;
 * 2. se tem, pede a permissão de saúde e valida se há horários de dormir/acordar;
 * 3. sem dispositivo (ou sem dados), coleta o horário usual de dormir/acordar —
 *    o fallback que mantém o Energy Score funcional sem wearable.
 *
 * A prévia da curva vive nesta mesma tela, e não num passo seguinte: o "aha" é
 * ver o gráfico mudar enquanto se mexe nos horários, e isso só acontece se o
 * gráfico estiver ao lado dos controles.
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
      // Persiste como usuais para o gate da Home e como fallback de energia.
      if (metrics.wakeTime && metrics.bedTime) {
        const wake = isoToTimeString(metrics.wakeTime);
        const bed = isoToTimeString(metrics.bedTime);
        if (wake && bed) {
          setUsualTimes({ wakeTime: wake, bedTime: bed });
          setWakeTime(wake);
          setBedTime(bed);
        }
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
          <ActivityIndicator color={accentOn(isDark)} />
        </View>
      </StepShell>
    );
  }

  if (phase === 'found') {
    return (
      <StepShell icon={step.icon} title="Dados de sono encontrados!" subtitle="Encontramos seus horários no app de saúde. Sua energia já é calculada com os dados reais do seu dispositivo." isDark={isDark}>
        <View className="mb-4 flex-row items-center rounded-2xl border p-4" style={{ borderColor: energyBorder('high', isDark), backgroundColor: energySurface('high', isDark) }}>
          <CircleCheck size={22} color={energyText('high', isDark)} />
          <Text className="ml-3 flex-1 text-[15px] font-semibold text-zinc-800 dark:text-zinc-100">Tudo pronto para calcular sua energia</Text>
        </View>

        <SleepEnergyPreview bedTime={bedTime} wakeTime={wakeTime} isDark={isDark} />

        <NavFooter label="Continuar" onPress={onNext} />
      </StepShell>
    );
  }

  if (phase === 'manual') {
    return (
      <StepShell icon={step.icon} title={step.title} subtitle="Informe seus horários usuais — dá para ajustar depois em Estatísticas, no card de Sono." isDark={isDark}>
        {noticeText ? (
          <View className="mb-4 rounded-2xl border p-3.5" style={{ borderColor: surface.border(isDark), backgroundColor: surface.subtle(isDark) }}>
            <Text className="text-sm leading-5 text-zinc-600 dark:text-zinc-300">{noticeText}</Text>
          </View>
        ) : null}

        <View className="gap-3">
          <TimeStepper label="Dormiu" Icon={Moon} value={bedTime} onChange={setBedTime} isDark={isDark} accent={ACCENT} />
          <TimeStepper label="Acordou" Icon={Sunrise} value={wakeTime} onChange={setWakeTime} isDark={isDark} accent={ACCENT} />
        </View>

        <View className="mt-4">
          <SleepEnergyPreview bedTime={bedTime} wakeTime={wakeTime} isDark={isDark} />
        </View>

        <ReassuranceCard isDark={isDark} />

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

      <ReassuranceCard isDark={isDark} />

      <Pressable onPress={onNext} accessibilityRole="button" className="mt-4 items-center py-2 active:opacity-70">
        <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{step.skipLabel}</Text>
      </Pressable>
    </StepShell>
  );
}
