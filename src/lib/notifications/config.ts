/**
 * Defaults e runtime de configuração da lib de notificações.
 *
 * A config é um singleton de módulo, definido uma vez no boot via
 * `configureNotifications`. Os demais módulos da lib leem de `getNotificationsConfig`.
 */

import Constants from 'expo-constants';

import { DEFAULT_ANDROID_IMPORTANCE } from './native';
import type { AndroidChannelConfig, NotificationForegroundBehavior, NotificationsConfig, NotificationsTelemetry } from './types';

/** Id do canal Android padrão usado para todas as notificações da lib. */
export const DEFAULT_ANDROID_CHANNEL_ID = 'default';

const DEFAULT_ANDROID_CHANNEL: Required<AndroidChannelConfig> = {
  id: DEFAULT_ANDROID_CHANNEL_ID,
  name: 'Padrão',
  importance: DEFAULT_ANDROID_IMPORTANCE,
  vibrationPattern: [0, 250, 250, 250],
  enableVibrate: true,
  lightColor: '#FFFFFF',
  sound: null,
};

const DEFAULT_FOREGROUND_BEHAVIOR: NotificationForegroundBehavior = {
  shouldShowBanner: true,
  shouldShowList: true,
  shouldPlaySound: true,
  shouldSetBadge: true,
};

const NOOP_TELEMETRY: Required<NotificationsTelemetry> = {
  addBreadcrumb: () => {},
  reportError: () => {},
};

/** Forma totalmente resolvida da config (sem campos opcionais). */
export type ResolvedNotificationsConfig = {
  projectId: string | undefined;
  androidChannel: Required<AndroidChannelConfig>;
  foregroundBehavior: NotificationForegroundBehavior;
  telemetry: Required<NotificationsTelemetry>;
};

function createDefaultConfig(): ResolvedNotificationsConfig {
  return {
    projectId: undefined,
    androidChannel: { ...DEFAULT_ANDROID_CHANNEL },
    foregroundBehavior: { ...DEFAULT_FOREGROUND_BEHAVIOR },
    telemetry: { ...NOOP_TELEMETRY },
  };
}

let config: ResolvedNotificationsConfig = createDefaultConfig();

/**
 * Resolve o `projectId` do EAS, necessário para o Expo Push Token.
 *
 * Prioriza o valor passado em `configureNotifications`; caso contrário lê de
 * `Constants.expoConfig.extra.eas.projectId` (definido em `app.json`).
 */
export function resolveProjectId(): string | undefined {
  if (config.projectId) return config.projectId;

  const eas = Constants.expoConfig?.extra?.eas as { projectId?: unknown } | undefined;
  return typeof eas?.projectId === 'string' ? eas.projectId : undefined;
}

/**
 * Define a configuração global da lib. Faz merge raso com a config atual
 * (e merge de `androidChannel`/`foregroundBehavior`). Chame uma vez no boot.
 */
export function configureNotifications(next: NotificationsConfig = {}): void {
  config = {
    projectId: next.projectId ?? config.projectId,
    androidChannel: { ...config.androidChannel, ...next.androidChannel },
    foregroundBehavior: { ...config.foregroundBehavior, ...next.foregroundBehavior },
    telemetry: { ...config.telemetry, ...next.telemetry },
  };
}

/** Retorna a config resolvida atual (uso interno da lib). */
export function getNotificationsConfig(): ResolvedNotificationsConfig {
  return config;
}

/** Restaura a config para os defaults. Útil em testes. */
export function resetNotificationsConfigForTests(): void {
  config = createDefaultConfig();
}
