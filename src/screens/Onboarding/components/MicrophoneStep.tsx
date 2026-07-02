import * as Sentry from '@sentry/react-native';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';

import { requestSpeechPermissions } from '@/lib/voice/useSpeechRecognition';

import type { MicrophoneStep as MicrophoneStepData } from '../data';
import NavFooter from './NavFooter';
import StepShell from './StepShell';

const ACCENT = '#6366f1';

type MicrophoneStepProps = {
  step: MicrophoneStepData;
  isDark: boolean;
  onNext: () => void;
};

/**
 * Passo de permissão do assistente de voz: solicita microfone (e, no iOS,
 * reconhecimento de fala) seguindo o mesmo padrão do passo de notificações.
 */
export default function MicrophoneStep({ step, isDark, onNext }: MicrophoneStepProps) {
  const [busy, setBusy] = useState(false);

  const handleEnable = async () => {
    setBusy(true);
    try {
      const status = await requestSpeechPermissions();

      if (status === 'denied') {
        // Não avança silenciosamente: reconhece a negativa e oferece o caminho
        // dos ajustes do sistema. Quem abrir os ajustes volta para este passo e
        // pode tocar no CTA de novo (a permissão é relida a cada tentativa).
        Alert.alert('Microfone desativado', 'Sem ele, você não consegue criar tarefas por voz. Dá para ativar nos ajustes do sistema — ou depois, no primeiro uso do assistente.', [
          { text: 'Abrir ajustes', onPress: () => Linking.openSettings().catch(() => undefined) },
          { text: 'Seguir sem voz', onPress: onNext },
        ]);
        return;
      }

      if (status === 'error') {
        // Falha técnica (ex.: módulo indisponível no simulador): informa e
        // segue — a permissão é solicitada de novo no primeiro uso.
        Alert.alert('Não foi possível ativar agora', 'Você poderá permitir o microfone no primeiro uso do assistente de voz.', [{ text: 'Continuar', onPress: onNext }]);
        return;
      }

      onNext();
    } catch (error) {
      Sentry.captureException(error);
      onNext();
    } finally {
      setBusy(false);
    }
  };

  return (
    <StepShell icon={step.icon} title={step.title} subtitle={step.subtitle} isDark={isDark}>
      <View className="gap-3">
        {step.benefits.map((benefit) => (
          <View key={benefit} className="flex-row items-center rounded-2xl border p-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)' }}>
            <View className="size-9 items-center justify-center rounded-full" style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.12)' }}>
              <Check size={18} color={ACCENT} strokeWidth={2.6} />
            </View>
            <Text className="ml-3 flex-1 text-[15px] leading-5 text-zinc-700 dark:text-zinc-200">{benefit}</Text>
          </View>
        ))}
      </View>

      <NavFooter label={step.ctaLabel} loading={busy} skipLabel={step.skipLabel} onPress={handleEnable} onSkip={onNext} />
    </StepShell>
  );
}
