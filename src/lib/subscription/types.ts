/**
 * Tipos públicos da lib de assinatura.
 */

import type { PersistedRecord } from '@/lib/storage';

/** Planos comercializados. */
export type SubscriptionPlanId = 'monthly' | 'yearly' | 'lifetime';

/** Estado da assinatura conforme o backend (`GET /subscription`). */
export type SubscriptionStatusValue = 'trial' | 'active' | 'expired' | 'none';

/** Metadados de um plano (parametrizáveis em `config.ts`). */
export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  productId: string;
  priceLabel: string;
  amount: number;
  period: 'month' | 'year' | 'lifetime';
  title: string;
};

/** Resposta de `GET /subscription` / `POST /subscription/payment`. */
export type SubscriptionStatus = {
  status: SubscriptionStatusValue;
  isPremium: boolean;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  plan?: SubscriptionPlanId | null;
};

/** Shape persistido em AsyncStorage (cache local do status). */
export type SubscriptionCache = PersistedRecord & SubscriptionStatus;

/** Corpo enviado ao backend após uma compra bem-sucedida. */
export type PaymentPayload = {
  plan: SubscriptionPlanId;
  productId: string;
  store: string;
  transactionId?: string | null;
  purchasedAt: string;
  entitlement: string;
};
