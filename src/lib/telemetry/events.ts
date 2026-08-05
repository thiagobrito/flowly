/**
 * Allowlist de eventos.
 *
 * Nenhum evento fora desta lista é enviado (o servidor aplica a mesma regra em
 * `web/src/lib/telemetry/schema.js`). Manter a lista curta e estável é o que
 * permite agregar o funil sem virar depósito de dados soltos.
 */

export const TELEMETRY_EVENTS = [
  // Aquisição e ativação
  'app_first_open',
  'app_open',
  'signup_started',
  'signup_succeeded',
  'signup_failed',
  'login_succeeded',
  'login_failed',

  // Onboarding
  'onboarding_step_viewed',
  'onboarding_step_skipped',
  'onboarding_completed',

  // Monetização
  'paywall_viewed',
  'paywall_dismissed',
  'checkout_started',
  'purchase_succeeded',
  'purchase_cancelled',
  'purchase_failed',
  'restore_failed',
  'funnel_exhausted',
  'locked_feature_tapped',

  // Falhas de infraestrutura
  'offering_missing',
  'subscription_sync_failed',
  'api_request_failed',

  // Produto — energia
  'energy_mode_selected',
  'peak_score_shared',

  // Produto — sugestões do coach
  'coach_suggestion_shown',
  'coach_suggestion_applied',
  'coach_suggestion_dismissed',

  // Produto — revisão semanal
  'weekly_review_opened',
  'weekly_review_push_opened',
] as const;

export type TelemetryEventName = (typeof TELEMETRY_EVENTS)[number];
