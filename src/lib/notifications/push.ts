/**
 * Push remoto (Expo Push Token).
 *
 * `registerForPushNotificationsAsync` cuida do fluxo completo: valida que é um
 * dispositivo físico, garante canal + permissão e obtém o Expo Push Token.
 * O envio do token ao backend fica a cargo do caller.
 */

import { ensureAndroidChannel } from './channels';
import { getNotificationsConfig, resolveProjectId } from './config';
import { getExpoNotifications } from './native';
import { ensurePermissions } from './permissions';
import type { PushRegistration } from './types';

function isPhysicalDevice(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    return (require('expo-device') as { isDevice: boolean }).isDevice;
  } catch {
    return false;
  }
}

/**
 * Registra o dispositivo para push remoto e retorna o Expo Push Token.
 *
 * Nunca lança: em qualquer falha retorna um `PushRegistration` com `status`
 * indicando o motivo (`unsupported`/`denied`/`error`).
 *
 * Push remoto exige um dev/standalone build (não funciona no Expo Go).
 */
export async function registerForPushNotificationsAsync(): Promise<PushRegistration> {
  const { telemetry } = getNotificationsConfig();
  const Notifications = getExpoNotifications();

  if (!Notifications) {
    telemetry.addBreadcrumb('push: módulo nativo indisponível — gere um novo build');
    return { status: 'unsupported', token: null };
  }

  if (!isPhysicalDevice()) {
    telemetry.addBreadcrumb('push: ignorado em emulador/simulador');
    return { status: 'unsupported', token: null };
  }

  await ensureAndroidChannel();

  const permission = await ensurePermissions();
  if (permission !== 'granted') {
    telemetry.addBreadcrumb('push: permissão não concedida', { permission });
    return { status: 'denied', token: null };
  }

  try {
    const projectId = resolveProjectId();
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    telemetry.addBreadcrumb('push: token obtido');
    return { status: 'granted', token: data };
  } catch (error) {
    telemetry.reportError(error, { scope: 'registerForPushNotificationsAsync' });
    return { status: 'error', token: null, error };
  }
}
