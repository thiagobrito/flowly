/**
 * Hook React para o ciclo de vida de notificações.
 *
 * Registra (e limpa no unmount) os listeners de recepção e de interação, e
 * opcionalmente dispara o registro de push, expondo o Expo Push Token.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { addNotificationReceivedListener, addNotificationResponseListener } from '../listeners';
import { registerForPushNotificationsAsync } from '../push';
import type { Notification, NotificationResponse, PushRegistration } from '../types';

export type UseNotificationsOptions = {
  /** Se `true`, dispara `registerForPush` automaticamente ao montar. Padrão: `false`. */
  registerForPush?: boolean;
  /** Chamado quando uma notificação chega com o app em foreground. */
  onReceived?: (notification: Notification) => void;
  /** Chamado quando o usuário interage (toca) com a notificação. */
  onResponse?: (response: NotificationResponse) => void;
};

export type UseNotificationsResult = {
  /** Expo Push Token, ou `null` enquanto não registrado. */
  expoPushToken: string | null;
  /** Dispara manualmente o registro de push. Resolve com o resultado completo. */
  registerForPush: () => Promise<PushRegistration>;
};

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsResult {
  const { registerForPush: autoRegister = false, onReceived, onResponse } = options;

  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  // Refs evitam re-registrar os listeners a cada mudança dos callbacks.
  const onReceivedRef = useRef(onReceived);
  const onResponseRef = useRef(onResponse);
  onReceivedRef.current = onReceived;
  onResponseRef.current = onResponse;

  useEffect(() => {
    const receivedSub = addNotificationReceivedListener((notification) => onReceivedRef.current?.(notification));
    const responseSub = addNotificationResponseListener((response) => onResponseRef.current?.(response));

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  const register = useCallback(async (): Promise<PushRegistration> => {
    const result = await registerForPushNotificationsAsync();
    setExpoPushToken(result.token);
    return result;
  }, []);

  useEffect(() => {
    if (autoRegister) {
      register().catch(() => undefined);
    }
  }, [autoRegister, register]);

  return { expoPushToken, registerForPush: register };
}
