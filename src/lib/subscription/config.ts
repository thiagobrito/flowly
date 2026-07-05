/**
 * Configuração da assinatura (RevenueCat).
 *
 * Centraliza chave de API, entitlement e os planos comercializados. Os valores
 * exibidos (preços) são **parâmetros** e podem ser alterados aqui no futuro sem
 * mexer na UI — o preço real do checkout vem das lojas via RevenueCat, mas estes
 * labels servem de exibição/fallback e como metadados enviados ao backend.
 */

import { Platform } from 'react-native';
import type { PurchasesIntroPrice } from 'react-native-purchases';

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

/** Descrição normalizada da oferta introdutória (trial) de um produto. */
export type IntroOfferInfo = {
  /** `true` quando a oferta é 100% gratuita (free trial). */
  isFree: boolean;
  /** Duração total da oferta em dias (ex.: P1W → 7, P1M → 30). */
  periodDays: number;
  /** Rótulo curto pronto para exibição (ex.: "7 dias"). */
  label: string;
};

const PERIOD_UNIT_DAYS: Record<string, number> = {
  YEAR: 365,
  MONTH: 30,
  WEEK: 7,
};

/** Converte uma unidade/valor ISO 8601 em quantidade aproximada de dias. */
function periodToDays(unit: string, units: number): number {
  return units * (PERIOD_UNIT_DAYS[unit] ?? 1);
}

/**
 * Normaliza o `introPrice` de um produto (RevenueCat/StoreKit) num objeto
 * amigável à UI. Retorna `null` quando não há oferta introdutória — nesse caso
 * o paywall deve mostrar apenas o preço cheio, sem mencionar "grátis".
 */
export function describeIntroOffer(introPrice: PurchasesIntroPrice | null | undefined): IntroOfferInfo | null {
  if (!introPrice) return null;

  const totalUnits = introPrice.periodNumberOfUnits * Math.max(1, introPrice.cycles);
  const periodDays = periodToDays(introPrice.periodUnit, totalUnits);
  const label = periodDays === 1 ? '1 dia' : `${periodDays} dias`;

  return { isFree: introPrice.price === 0, periodDays, label };
}

/** Tenta inferir o plano a partir do identificador de produto da loja. */
export function resolvePlanId(productId: string | null | undefined): SubscriptionPlanId | null {
  if (!productId) return null;
  const id = productId.toLowerCase();
  if (id.includes('life') || id.includes('rc_lifetime')) return null;
  if (id.includes('year') || id.includes('annual') || id.includes('anual')) return 'flowly_yearly';
  if (id.includes('mont') || id.includes('month') || id.includes('mensal')) return 'flowly_montly';
  return null;
}
