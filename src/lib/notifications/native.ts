/**
 * Carregamento lazy de `expo-notifications`.
 *
 * O pacote exige código nativo linkado no dev client. Quando o build ainda não
 * foi regenerado após adicionar a dependência, importar o módulo no top-level
 * quebra o app (`Cannot find native module 'ExpoPushTokenManager'`).
 *
 * Este módulo adia o `require` e trata a ausência do native como indisponível.
 */

import type * as ExpoNotifications from 'expo-notifications';

export type ExpoNotificationsModule = typeof ExpoNotifications;

/** Valor numérico de `AndroidImportance.DEFAULT` (5). Evita import runtime do expo. */
export const DEFAULT_ANDROID_IMPORTANCE = 5;

let cachedModule: ExpoNotificationsModule | null | undefined;

function loadExpoNotifications(): ExpoNotificationsModule | null {
  if (cachedModule !== undefined) return cachedModule;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    cachedModule = require('expo-notifications') as ExpoNotificationsModule;
  } catch {
    cachedModule = null;
  }

  return cachedModule;
}

/** Retorna o módulo nativo ou `null` se o build ainda não inclui `expo-notifications`. */
export function getExpoNotifications(): ExpoNotificationsModule | null {
  return loadExpoNotifications();
}

/** `true` quando `expo-notifications` está linkado no binário nativo. */
export function isNotificationsNativeAvailable(): boolean {
  return loadExpoNotifications() !== null;
}

/** Subscription no-op para listeners quando o native não está disponível. */
export const NOOP_EVENT_SUBSCRIPTION = { remove: () => {} };

/** Restaura o cache de disponibilidade. Útil em testes. */
export function resetNotificationsNativeCacheForTests(): void {
  cachedModule = undefined;
}

export class NotificationsNativeUnavailableError extends Error {
  constructor() {
    super('expo-notifications não está disponível. Gere um novo build nativo (ex.: npx expo run:ios).');
    this.name = 'NotificationsNativeUnavailableError';
  }
}

export function assertNotificationsNativeAvailable(): ExpoNotificationsModule {
  const notifications = getExpoNotifications();
  if (!notifications) throw new NotificationsNativeUnavailableError();
  return notifications;
}
