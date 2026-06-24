/**
 * Chamadas ao backend Flowly para assinatura.
 *
 * - `GET /subscription` — status atual (trial/assinatura) controlado pelo servidor.
 * - `POST /subscription/payment` — notifica o servidor após uma compra concluída.
 */

import type { CustomerInfo } from 'react-native-purchases';

import { api } from '@/lib/network';

import { ENTITLEMENT_ID, resolvePlanId } from './config';
import type { PaymentPayload, SubscriptionStatus } from './types';

/** Busca o status da assinatura no backend. */
export function fetchSubscription(): Promise<SubscriptionStatus> {
  return api.get<SubscriptionStatus>('/subscription');
}

/** Informa o backend de uma compra bem-sucedida. */
export function notifyPayment(payload: PaymentPayload): Promise<SubscriptionStatus> {
  return api.post<SubscriptionStatus>('/subscription/payment', payload);
}

/**
 * Monta o payload de pagamento a partir do `CustomerInfo` do RevenueCat.
 * Retorna `null` se o entitlement "Flowly Pro" não estiver ativo.
 */
export function buildPaymentPayload(info: CustomerInfo, transactionId?: string | null): PaymentPayload | null {
  const entitlement = info.entitlements.active[ENTITLEMENT_ID];
  if (!entitlement) return null;

  return {
    plan: resolvePlanId(entitlement.productIdentifier) ?? 'flowly_montly',
    productId: entitlement.productIdentifier,
    store: String(entitlement.store),
    transactionId: transactionId ?? null,
    purchasedAt: entitlement.latestPurchaseDate ?? new Date().toISOString(),
    entitlement: ENTITLEMENT_ID,
  };
}
