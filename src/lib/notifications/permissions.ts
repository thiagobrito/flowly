/**
 * Permissões de notificação.
 *
 * Envolve `getPermissionsAsync`/`requestPermissionsAsync` do `expo-notifications`
 * e normaliza a resposta para um status simples (`granted`/`denied`/`undetermined`),
 * tratando o caso provisório do iOS como concedido.
 */

import { getExpoNotifications } from './native';
import type { PushPermissionStatus } from './types';

type PermissionSettings = Awaited<ReturnType<NonNullable<ReturnType<typeof getExpoNotifications>>['getPermissionsAsync']>>;

function normalize(settings: PermissionSettings): PushPermissionStatus {
  // No iOS, autorização "provisória" (3) permite entregar notificações silenciosas.
  if (settings.granted || settings.ios?.status === 3) {
    return 'granted';
  }
  if (settings.status === 'denied') return 'denied';
  return 'undetermined';
}

/** Lê o status atual da permissão, sem prompt para o usuário. */
export async function getPermissionStatus(): Promise<PushPermissionStatus> {
  const Notifications = getExpoNotifications();
  if (!Notifications) return 'undetermined';

  const settings = await Notifications.getPermissionsAsync();
  return normalize(settings);
}

/**
 * Solicita a permissão ao usuário (prompt do sistema). No iOS pede alerta,
 * badge e som. Retorna o status resultante.
 */
export async function requestPermissions(): Promise<PushPermissionStatus> {
  const Notifications = getExpoNotifications();
  if (!Notifications) return 'undetermined';

  const settings = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return normalize(settings);
}

/**
 * Garante a permissão: lê o status e só dispara o prompt se ainda não foi
 * concedida nem negada. Retorna o status final.
 */
export async function ensurePermissions(): Promise<PushPermissionStatus> {
  const current = await getPermissionStatus();
  if (current === 'granted' || current === 'denied') return current;
  return requestPermissions();
}
