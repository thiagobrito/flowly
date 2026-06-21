/**
 * Tipos públicos da lib de notificações.
 *
 * Mantidos isolados da implementação para que callers possam importar apenas os
 * contratos (ex.: em assinaturas de funções) sem puxar `expo-notifications`.
 */

import type { EventSubscription, Notification, NotificationResponse } from 'expo-notifications';

/**
 * Conteúdo de uma notificação local. Mapeado internamente para o
 * `NotificationContentInput` do `expo-notifications`.
 */
export type NotificationContent = {
  /** Título em negrito exibido acima do corpo. */
  title: string;
  /** Texto principal da notificação. */
  body?: string;
  /** Subtítulo (iOS) / subText (Android). */
  subtitle?: string;
  /** Dados arbitrários entregues ao app (não exibidos). Úteis para deep links. */
  data?: Record<string, unknown>;
  /** Som ao disparar. `true` usa o som padrão; string aponta para um som custom. */
  sound?: boolean | string;
  /** Valor do badge do ícone do app. */
  badge?: number;
};

/** Dispara uma única vez em uma data/hora absoluta. */
export type DateTrigger = {
  type: 'date';
  /** Momento do disparo (`Date` ou timestamp em ms). */
  date: Date | number;
};

/** Dispara todos os dias quando `hour`/`minute` baterem (0-23 / 0-59). */
export type DailyTrigger = {
  type: 'daily';
  hour: number;
  minute: number;
};

/** Dispara após `seconds` decorrerem, opcionalmente repetindo. */
export type TimeIntervalTrigger = {
  type: 'timeInterval';
  /** Segundos até o disparo. Com `repeats: true` no iOS, deve ser >= 60. */
  seconds: number;
  /** Repete a cada `seconds`. Padrão: `false`. */
  repeats?: boolean;
};

/** União dos gatilhos de agendamento suportados pela lib. */
export type NotificationTrigger = DateTrigger | DailyTrigger | TimeIntervalTrigger;

/** Comportamento aplicado quando a notificação chega com o app em foreground. */
export type NotificationForegroundBehavior = {
  /** Mostra o banner no topo da tela (iOS 14+/Android). */
  shouldShowBanner: boolean;
  /** Inclui na central/lista de notificações. */
  shouldShowList: boolean;
  /** Toca o som. */
  shouldPlaySound: boolean;
  /** Atualiza o badge do ícone (iOS). */
  shouldSetBadge: boolean;
};

/** Configuração do canal Android (obrigatório a partir do Android 8). */
export type AndroidChannelConfig = {
  /** Identificador do canal. */
  id: string;
  /** Nome visível ao usuário nas configurações do sistema. */
  name: string;
  /** Importância (controla heads-up, som, etc.). Valor numérico de `AndroidImportance`. */
  importance?: number;
  /** Padrão de vibração em ms (`[delay, vibra, pausa, ...]`). */
  vibrationPattern?: number[];
  /** Habilita vibração. */
  enableVibrate?: boolean;
  /** Cor do LED (`#RRGGBB`). */
  lightColor?: string;
  /** Som custom do canal (`null` desabilita som). */
  sound?: string | null;
};

/** Telemetria opcional (ex.: Sentry). Default: no-op. */
export type NotificationsTelemetry = {
  addBreadcrumb?: (message: string, data?: Record<string, unknown>) => void;
  reportError?: (error: unknown, context?: Record<string, unknown>) => void;
};

/** Configuração global da lib, aplicada uma vez no boot via `configureNotifications`. */
export type NotificationsConfig = {
  /** `projectId` do EAS para o Expo Push Token. Default: lido de `app.json`. */
  projectId?: string;
  /** Sobrescreve campos do canal Android padrão. */
  androidChannel?: Partial<AndroidChannelConfig>;
  /** Sobrescreve o comportamento de foreground. */
  foregroundBehavior?: Partial<NotificationForegroundBehavior>;
  /** Telemetria injetada (ex.: `@/lib/sentry`). */
  telemetry?: NotificationsTelemetry;
};

/** Status simplificado da permissão de notificações. */
export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined';

/** Resultado do registro para push remoto. */
export type PushRegistration = {
  /**
   * - `granted`: permissão concedida e token obtido
   * - `denied`: usuário negou a permissão
   * - `unsupported`: emulador/simulador ou plataforma sem push
   * - `error`: falha ao obter o token (ex.: offline)
   */
  status: 'granted' | 'denied' | 'unsupported' | 'error';
  /** Expo Push Token, quando `status === 'granted'`. */
  token: string | null;
  /** Erro capturado quando `status === 'error'`. */
  error?: unknown;
};

export type { EventSubscription, Notification, NotificationResponse };
