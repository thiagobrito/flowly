/**
 * Configuração da assinatura (RevenueCat).
 *
 * Centraliza chave de API, entitlement e os planos comercializados. Os valores
 * exibidos (preços) são **parâmetros** e podem ser alterados aqui no futuro sem
 * mexer na UI — o preço real do checkout vem das lojas via RevenueCat, mas estes
 * labels servem de exibição/fallback e como metadados enviados ao backend.
 */

import { Platform } from 'react-native';

import type { SubscriptionPlan, SubscriptionPlanId } from './plans';

/** Chave pública do RevenueCat. Prioriza chave da plataforma (appl_/goog_); fallback genérico. */
export const RC_API_KEY: string = (Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_RC_IOS_KEY : process.env.EXPO_PUBLIC_RC_ANDROID_KEY) || process.env.EXPO_PUBLIC_RC_KEY || '';

/**
 * Valida se a chave de API pode ser usada nesta plataforma/build.
 * Em Release, iOS exige `appl_` e Android exige `goog_`; chaves `test_` só em __DEV__.
 */
export function isUsableApiKey(key: string): boolean {
  if (!key) return false;
  if (__DEV__) return true;
  if (key.startsWith('test_')) return false;
  if (Platform.OS === 'ios') return key.startsWith('appl_');
  if (Platform.OS === 'android') return key.startsWith('goog_');
  return false;
}

/** Identificador do entitlement configurado no dashboard do RevenueCat. */
export const ENTITLEMENT_ID = 'Flowly Pro';

/**
 * Planos disponíveis. `productId` deve casar com os identificadores dos produtos
 * nas lojas / RevenueCat. Os `priceLabel`/`amount` são parametrizáveis.
 */
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlan> = {
  flowly_montly: { id: 'flowly_montly', productId: 'flowly_montly', priceLabel: 'R$ 19,90', amount: 19.9, period: 'month', title: 'Mensal' },
  flowly_yearly: { id: 'flowly_yearly', productId: 'flowly_yearly', priceLabel: 'R$ 197,00', amount: 197, period: 'year', title: 'Anual' },
};

/** Tenta inferir o plano a partir do identificador de produto da loja. */
export function resolvePlanId(productId: string | null | undefined): SubscriptionPlanId | null {
  if (!productId) return null;
  const id = productId.toLowerCase();
  if (id.includes('year') || id.includes('annual') || id.includes('anual')) return 'flowly_yearly';
  if (id.includes('mont') || id.includes('month') || id.includes('mensal')) return 'flowly_montly';
  return null;
}
