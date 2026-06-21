/**
 * Canais de notificação do Android.
 *
 * A partir do Android 8 (API 26) toda notificação precisa pertencer a um canal.
 * `ensureAndroidChannel` cria/atualiza o canal padrão da config. Em iOS/web é no-op.
 */

import { Platform } from 'react-native';

import { getNotificationsConfig } from './config';
import { getExpoNotifications } from './native';

/**
 * Garante a existência do canal Android padrão (definido em `configureNotifications`).
 * Idempotente: chamar várias vezes apenas atualiza o canal. No-op fora do Android.
 */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const Notifications = getExpoNotifications();
  if (!Notifications) return;

  const { androidChannel } = getNotificationsConfig();

  await Notifications.setNotificationChannelAsync(androidChannel.id, {
    name: androidChannel.name,
    importance: androidChannel.importance,
    vibrationPattern: androidChannel.vibrationPattern,
    enableVibrate: androidChannel.enableVibrate,
    lightColor: androidChannel.lightColor,
    sound: androidChannel.sound,
  });
}
