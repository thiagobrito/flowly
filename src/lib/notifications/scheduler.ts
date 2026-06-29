/**
 * Agendamento de notificações locais.
 *
 * Traduz os gatilhos simplificados da lib (`NotificationTrigger`) para os
 * trigger inputs do `expo-notifications` e expõe atalhos comuns (`scheduleAt`,
 * `scheduleDaily`). No Android, todos os agendamentos usam o canal padrão.
 */

import type { SchedulableNotificationTriggerInput } from 'expo-notifications';
import { Platform } from 'react-native';

import { DEFAULT_ANDROID_CHANNEL_ID } from './config';
import { assertNotificationsNativeAvailable } from './native';
import type { NotificationContent, NotificationTrigger } from './types';

function toContentInput(content: NotificationContent) {
  return {
    title: content.title,
    data: content.data ?? {},
    ...(content.body !== undefined ? { body: content.body } : {}),
    ...(content.subtitle !== undefined ? { subtitle: content.subtitle } : {}),
    ...(content.sound !== undefined ? { sound: content.sound } : {}),
    ...(content.badge !== undefined ? { badge: content.badge } : {}),
  };
}

function toTriggerInput(trigger: NotificationTrigger): SchedulableNotificationTriggerInput {
  const Notifications = assertNotificationsNativeAvailable();
  const channelId = Platform.OS === 'android' ? DEFAULT_ANDROID_CHANNEL_ID : undefined;
  const { SchedulableTriggerInputTypes: Types } = Notifications;

  switch (trigger.type) {
    case 'date':
      return { type: Types.DATE, date: trigger.date, channelId };
    case 'daily':
      return { type: Types.DAILY, hour: trigger.hour, minute: trigger.minute, channelId };
    case 'timeInterval':
      return {
        type: Types.TIME_INTERVAL,
        seconds: trigger.seconds,
        repeats: trigger.repeats ?? false,
        channelId,
      };
    default:
      return trigger;
  }
}

/**
 * Agenda uma notificação local com o gatilho informado. Retorna o id do
 * agendamento (use-o em `cancelNotification`).
 */
export function scheduleNotification(content: NotificationContent, trigger: NotificationTrigger): Promise<string> {
  const Notifications = assertNotificationsNativeAvailable();
  return Notifications.scheduleNotificationAsync({
    content: toContentInput(content),
    trigger: toTriggerInput(trigger),
  });
}

/** Atalho: agenda uma notificação única para uma data/hora absoluta. */
export function scheduleAt(content: NotificationContent, date: Date | number): Promise<string> {
  return scheduleNotification(content, { type: 'date', date });
}

/** Atalho: agenda uma notificação diária recorrente em `hour:minute`. */
export function scheduleDaily(content: NotificationContent, hour: number, minute: number): Promise<string> {
  return scheduleNotification(content, { type: 'daily', hour, minute });
}

/** Cancela um agendamento específico pelo id retornado por `scheduleNotification`. */
export function cancelNotification(identifier: string): Promise<void> {
  return assertNotificationsNativeAvailable().cancelScheduledNotificationAsync(identifier);
}

/** Cancela todas as notificações agendadas pelo app. */
export function cancelAllNotifications(): Promise<void> {
  return assertNotificationsNativeAvailable().cancelAllScheduledNotificationsAsync();
}

/** Lista todas as notificações atualmente agendadas. */
export function getScheduledNotifications() {
  return assertNotificationsNativeAvailable().getAllScheduledNotificationsAsync();
}
