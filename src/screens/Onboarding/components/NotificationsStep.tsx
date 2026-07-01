import * as Sentry from '@sentry/react-native';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';

import { useNotifications } from '@/lib/notifications';

import type { NotificationsStep as NotificationsStepData } from '../data';
import NavFooter from './NavFooter';
import StepShell from './StepShell';

const ACCENT = '#6366f1';

type NotificationsStepProps = {
  step: NotificationsStepData;
  isDark: boolean;
  onNext: () => void;
};

export default function NotificationsStep({ step, isDark, onNext }: NotificationsStepProps) {
  const { registerForPush } = useNotifications();
  const [busy, setBusy] = useState(false);

  const handleEnable = async () => {
    setBusy(true);
    try {
      const { status } = await registerForPush();

      if (status === 'denied') {
        // Não avança silenciosamente: reconhece a negativa e oferece o caminho
        // dos ajustes do sistema. Quem abrir os ajustes volta para este passo e
        // pode tocar no CTA de novo (a permissão é relida a cada tentativa).
        Alert.alert('Notificações desativadas', 'Sem elas, você não recebe os lembretes das suas atividades. Dá para ativar nos ajustes do sistema — ou depois, em Configurações > Notificações.', [
          { text: 'Abrir ajustes', onPress: () => Linking.openSettings().catch(() => undefined) },
          { text: 'Seguir sem lembretes', onPress: onNext },
        ]);
        return;
      }

      if (status === 'error') {
        // Falha técnica (ex.: offline ao obter o token): informa e segue — o
        // usuário pode reativar depois em Configurações.
        Alert.alert('Não foi possível ativar agora', 'Você pode ativar as notificações mais tarde em Configurações > Notificações.', [{ text: 'Continuar', onPress: onNext }]);
        return;
      }

      // `granted`: sucesso. `unsupported` (simulador/Expo Go): nada a fazer.
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
