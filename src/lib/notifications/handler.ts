/**
 * Handler de foreground.
 *
 * Por padrão o `expo-notifications` **não** exibe notificações recebidas
 * enquanto o app está aberto. `setupNotificationHandler` registra um handler que
 * aplica o `foregroundBehavior` da config.
 */

import { getNotificationsConfig } from './config';
import { getExpoNotifications } from './native';

/**
 * Registra o handler de notificações em foreground. Chame uma vez no boot,
 * antes de qualquer notificação poder chegar.
 *
 * No-op quando o módulo nativo ainda não foi linkado no build.
 */
export function setupNotificationHandler(): void {
  const Notifications = getExpoNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const { foregroundBehavior } = getNotificationsConfig();
      return { ...foregroundBehavior };
    },
  });
}

/** Remove o handler de foreground (volta ao comportamento padrão do SO). */
export function clearNotificationHandler(): void {
  getExpoNotifications()?.setNotificationHandler(null);
}
