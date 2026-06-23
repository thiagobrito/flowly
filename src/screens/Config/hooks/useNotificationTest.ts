import { useCallback } from 'react';
import { Alert } from 'react-native';

import { ensureAndroidChannel, ensurePermissions, notifications } from '@/lib/notifications';

const TEST_CONTENT = {
  title: 'Teste: Hora de iniciar',
  body: 'Notificação de teste do Flowly.',
  sound: true,
  data: { type: 'notification_test' },
};

async function ensureNotificationPermission(): Promise<boolean> {
  const status = await ensurePermissions();
  if (status !== 'granted') {
    Alert.alert('Permissão necessária', 'Para receber lembretes, permita as notificações nas configurações do dispositivo.');
    return false;
  }
  return true;
}

export function useNotificationTest() {
  const showNow = useCallback(async () => {
    if (!(await ensureNotificationPermission())) return;

    try {
      await ensureAndroidChannel();
      await notifications.schedule(TEST_CONTENT, { type: 'timeInterval', seconds: 1 });
    } catch {
      Alert.alert('Erro', 'Não foi possível agendar a notificação de teste.');
    }
  }, []);

  const showIn30Seconds = useCallback(async () => {
    if (!(await ensureNotificationPermission())) return;

    try {
      await ensureAndroidChannel();
      await notifications.scheduleAt(TEST_CONTENT, Date.now() + 30_000);
      Alert.alert('Agendada', 'A notificação aparecerá em 30 segundos.');
    } catch {
      Alert.alert('Erro', 'Não foi possível agendar a notificação de teste.');
    }
  }, []);

  return { showNow, showIn30Seconds };
}
