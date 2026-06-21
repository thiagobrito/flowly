/**
 * Defaults e configuração da lib de Google Calendar.
 *
 * Os Client IDs do OAuth são lidos do ambiente (variáveis `EXPO_PUBLIC_GOOGLE_*`,
 * embutidas no bundle pelo Expo). Veja o README do projeto, seção "Integração
 * com Google Calendar", para obtê-los no Google Cloud Console.
 */

/** Base da Google Calendar REST API (v3). */
export const GOOGLE_CALENDAR_BASE_URL = 'https://www.googleapis.com/calendar/v3';

/**
 * Escopos solicitados no OAuth. Apenas leitura — o fluxo é pull (Google ->
 * Flowly) e nunca cria/edita eventos no Google.
 */
export const GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

/** Janela padrão (em dias, a partir de agora) de eventos importados. */
export const DEFAULT_SYNC_WINDOW_DAYS = 30;

/** Chave de storage dos tokens OAuth. */
export const GOOGLE_TOKENS_KEY = 'google_calendar_tokens_v1';

/** Chave de storage do mapa `eventId -> taskId` (dedupe de importação). */
export const GOOGLE_SYNC_MAP_KEY = 'google_calendar_sync_map_v1';

/** Área de vida padrão atribuída às tarefas criadas a partir de eventos. */
export const DEFAULT_EVENT_AREA = 'other';

/** Nível padrão de energia/impacto das tarefas importadas (igual ao NewTask). */
export const DEFAULT_EVENT_LEVEL = 3;

/** Client IDs do OAuth do Google, resolvidos do ambiente. */
export type GoogleClientIds = {
  iosClientId?: string;
  androidClientId?: string;
  webClientId?: string;
};

const sanitize = (value: string | undefined): string | undefined => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 ? trimmed : undefined;
};

/** Lê os Client IDs do ambiente. Valores vazios viram `undefined`. */
export function getGoogleClientIds(): GoogleClientIds {
  return {
    iosClientId: sanitize(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
    androidClientId: sanitize(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
    webClientId: sanitize(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
  };
}

/** Indica se há ao menos um Client ID configurado (OAuth utilizável). */
export function hasGoogleClientIds(): boolean {
  const ids = getGoogleClientIds();
  return Boolean(ids.iosClientId || ids.androidClientId || ids.webClientId);
}
