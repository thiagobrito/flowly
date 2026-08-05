/**
 * # Push local da revisão semanal
 *
 * Notificação local recorrente que abre o digest da semana. O onboarding pede
 * permissão de notificação citando a "revisão semanal", então este é o
 * cumprimento dessa promessa.
 *
 * Segue o padrão de `@/lib/taskReminders`: cancelamento seletivo por
 * `data.type`, para não tocar nas notificações de outros módulos, e um único
 * agendamento recorrente — o teto de 64 pendentes do iOS é sensível aos
 * lembretes de tarefa, que são muitos, e não vale gastar slots aqui.
 */

import { ensureAndroidChannel, getPermissionStatus, getScheduledNotifications, notifications } from '@/lib/notifications';
import { getNotificationsConfig } from '@/lib/notifications/config';

/** Tag em `content.data.type` que identifica notificações deste módulo. */
export const WEEKLY_REVIEW_DATA_TYPE = 'weekly_review';

/** Domingo (1 = domingo no `expo-notifications`), 19:00. */
export const WEEKLY_REVIEW_WEEKDAY = 1;
export const WEEKLY_REVIEW_HOUR = 19;
export const WEEKLY_REVIEW_MINUTE = 0;

const CONTENT = {
  title: 'Sua semana em números',
  body: 'Veja sua energia média, o dia mais forte e o equilíbrio entre as áreas.',
  sound: true,
  data: { type: WEEKLY_REVIEW_DATA_TYPE },
};

async function scheduledForThisModule() {
  const scheduled = await getScheduledNotifications();
  return scheduled.filter((item) => (item.content?.data as { type?: string } | undefined)?.type === WEEKLY_REVIEW_DATA_TYPE);
}

/** Cancela apenas as notificações agendadas por este módulo. */
export async function cancelWeeklyReviewNotification(): Promise<void> {
  try {
    const mine = await scheduledForThisModule();
    await Promise.all(mine.map((item) => notifications.cancel(item.identifier)));
  } catch {
    // Notificações indisponíveis (ex.: Expo Go) — silenciosamente ignora.
  }
}

/**
 * Garante exatamente um agendamento semanal ativo.
 *
 * Idempotente: se já existe um agendamento deste módulo, não faz nada — chamar
 * a cada abertura do app não acumula duplicatas nem reinicia o ciclo.
 */
export async function ensureWeeklyReviewNotification(): Promise<void> {
  try {
    const permission = await getPermissionStatus();
    if (permission !== 'granted') return;

    const mine = await scheduledForThisModule();
    if (mine.length === 1) return;

    // Zero (primeira vez) ou mais de um (duplicado por versão anterior):
    // limpa e reagenda para convergir num único agendamento.
    if (mine.length > 1) await cancelWeeklyReviewNotification();

    await ensureAndroidChannel();
    await notifications.scheduleWeekly(CONTENT, WEEKLY_REVIEW_WEEKDAY, WEEKLY_REVIEW_HOUR, WEEKLY_REVIEW_MINUTE);
  } catch (error) {
    getNotificationsConfig().telemetry.reportError(error, { source: 'ensureWeeklyReviewNotification' });
  }
}
