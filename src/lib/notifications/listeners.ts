/**
 * Recepção de notificações (locais e push) em runtime.
 *
 * - `addNotificationReceivedListener`: notificação chega com o app em foreground.
 * - `addNotificationResponseListener`: usuário interage (toca) na notificação.
 * - `getLastNotificationResponse`: resposta mais recente, útil para cold start
 *   (app aberto a partir de um toque na notificação).
 */

import { getExpoNotifications, NOOP_EVENT_SUBSCRIPTION } from './native';
import type { EventSubscription, Notification, NotificationResponse } from './types';

/**
 * Registra um listener para notificações recebidas com o app aberto.
 * Lembre-se de chamar `.remove()` na subscription retornada ao desmontar.
 */
export function addNotificationReceivedListener(listener: (notification: Notification) => void): EventSubscription {
  const Notifications = getExpoNotifications();
  if (!Notifications) return NOOP_EVENT_SUBSCRIPTION;
  return Notifications.addNotificationReceivedListener(listener);
}

/**
 * Registra um listener para a interação do usuário com a notificação (toque).
 * O `response.notification.request.content.data` carrega os dados para deep link.
 */
export function addNotificationResponseListener(listener: (response: NotificationResponse) => void): EventSubscription {
  const Notifications = getExpoNotifications();
  if (!Notifications) return NOOP_EVENT_SUBSCRIPTION;
  return Notifications.addNotificationResponseReceivedListener(listener);
}

/**
 * Retorna a última resposta de notificação (toque), ou `null`. Use-a no boot
 * para rotear quando o app é aberto a partir de uma notificação.
 */
export function getLastNotificationResponse(): NotificationResponse | null {
  return getExpoNotifications()?.getLastNotificationResponse() ?? null;
}
