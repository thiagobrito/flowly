/**
 * # Notifications library
 *
 * Centraliza o sistema de notificações do app sobre `expo-notifications`:
 * agendamento de notificações locais por horário, recepção de push remoto
 * (Expo Push Token), permissões, canal Android e handler de foreground.
 *
 * Ponto único de configuração e uso — telas/serviços não importam
 * `expo-notifications` direto.
 *
 * ## Setup (uma vez, no boot)
 *
 * ```ts
 * import { configureNotifications, setupNotificationHandler } from '@/lib/notifications';
 * import { addBreadcrumb, reportError } from '@/lib/sentry'; // opcional
 *
 * setupNotificationHandler(); // exibe notificações com o app aberto
 * configureNotifications({
 *   telemetry: { addBreadcrumb, reportError }, // opcional (default: no-op)
 *   androidChannel: { name: 'Lembretes' },     // opcional
 * });
 * ```
 *
 * ## Agendar notificações locais
 *
 * ```ts
 * import { notifications } from '@/lib/notifications';
 *
 * // Em uma data/hora específica
 * const id = await notifications.scheduleAt(
 *   { title: 'Hora de meditar', body: '5 minutos de respiração' },
 *   new Date(Date.now() + 60_000),
 * );
 *
 * // Todos os dias às 08:00
 * await notifications.scheduleDaily({ title: 'Bom dia!', body: 'Planeje seu dia' }, 8, 0);
 *
 * // Gatilho genérico (date | daily | timeInterval)
 * await notifications.schedule({ title: 'Pausa' }, { type: 'timeInterval', seconds: 3600, repeats: true });
 *
 * // Gerenciar
 * await notifications.getScheduled();
 * await notifications.cancel(id);
 * await notifications.cancelAll();
 * ```
 *
 * ## Push remoto (Expo Push Token)
 *
 * ```ts
 * import { registerForPushNotificationsAsync } from '@/lib/notifications';
 *
 * const result = await registerForPushNotificationsAsync();
 * if (result.status === 'granted') {
 *   console.log('Expo Push Token:', result.token); // envie ao backend
 * }
 * ```
 *
 * > Push remoto exige um dev/standalone build (não funciona no Expo Go).
 *
 * ## Receber/responder (hook React)
 *
 * ```tsx
 * import { useNotifications } from '@/lib/notifications';
 *
 * function Root() {
 *   const { expoPushToken } = useNotifications({
 *     registerForPush: true,
 *     onResponse: (response) => {
 *       const { data } = response.notification.request.content;
 *       // rotear via data (deep link)
 *     },
 *   });
 *   return null;
 * }
 * ```
 *
 * ## Exports principais
 *
 * - `notifications` — facade com scheduler/push/listeners
 * - `configureNotifications` / `setupNotificationHandler` — setup no boot
 * - `useNotifications` — hook de listeners + push token
 * - `registerForPushNotificationsAsync` — obtém o Expo Push Token
 * - Scheduler: `scheduleNotification`, `scheduleAt`, `scheduleDaily`, `cancelNotification`, `cancelAllNotifications`, `getScheduledNotifications`
 * - Listeners: `addNotificationReceivedListener`, `addNotificationResponseListener`, `getLastNotificationResponse`
 * - Permissões: `getPermissionStatus`, `requestPermissions`, `ensurePermissions`
 * - Tipos: `NotificationContent`, `NotificationTrigger`, `PushRegistration`, etc.
 */

import { addNotificationReceivedListener, addNotificationResponseListener, getLastNotificationResponse } from './listeners';
import { registerForPushNotificationsAsync } from './push';
import { cancelAllNotifications, cancelNotification, getScheduledNotifications, scheduleAt, scheduleDaily, scheduleNotification } from './scheduler';

/**
 * Facade agregando as operações mais comuns. Para APIs avançadas, importe as
 * funções nomeadas diretamente.
 */
export const notifications = {
  schedule: scheduleNotification,
  scheduleAt,
  scheduleDaily,
  cancel: cancelNotification,
  cancelAll: cancelAllNotifications,
  getScheduled: getScheduledNotifications,
  registerForPush: registerForPushNotificationsAsync,
  onReceived: addNotificationReceivedListener,
  onResponse: addNotificationResponseListener,
  getLastResponse: getLastNotificationResponse,
} as const;

export { ensureAndroidChannel } from './channels';
export { configureNotifications, DEFAULT_ANDROID_CHANNEL_ID, getNotificationsConfig, resetNotificationsConfigForTests, resolveProjectId } from './config';
export { clearNotificationHandler, setupNotificationHandler } from './handler';
export type { UseNotificationsOptions, UseNotificationsResult } from './hooks/useNotifications';
export { useNotifications } from './hooks/useNotifications';
export { addNotificationReceivedListener, addNotificationResponseListener, getLastNotificationResponse } from './listeners';
export { assertNotificationsNativeAvailable, getExpoNotifications, isNotificationsNativeAvailable, NotificationsNativeUnavailableError, resetNotificationsNativeCacheForTests } from './native';
export { ensurePermissions, getPermissionStatus, requestPermissions } from './permissions';
export { registerForPushNotificationsAsync } from './push';
export { cancelAllNotifications, cancelNotification, getScheduledNotifications, scheduleAt, scheduleDaily, scheduleNotification } from './scheduler';
export type {
  AndroidChannelConfig,
  DailyTrigger,
  DateTrigger,
  EventSubscription,
  Notification,
  NotificationContent,
  NotificationForegroundBehavior,
  NotificationResponse,
  NotificationsConfig,
  NotificationsTelemetry,
  NotificationTrigger,
  PushPermissionStatus,
  PushRegistration,
  TimeIntervalTrigger,
} from './types';
