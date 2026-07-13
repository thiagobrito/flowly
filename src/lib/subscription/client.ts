/**
 * Wrapper fino sobre o SDK `react-native-purchases`.
 *
 * Encapsula toda a interação com o RevenueCat (configure/login/compra/restore)
 * para que telas e hooks não importem o SDK diretamente. Em web (ou onde o
 * módulo nativo não está disponível) as operações viram no-ops seguros.
 */

import { NativeModules, Platform } from 'react-native';
import type { CustomerInfo, INTRO_ELIGIBILITY_STATUS, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

import { ENTITLEMENT_ID, isUsableApiKey, RC_API_KEY } from './config';

let configured = false;

function devWarn(message: string, error?: unknown): void {
  if (!__DEV__) return;
  // eslint-disable-next-line no-console -- subscription bootstrap diagnostics
  console.warn(...(error === undefined ? [message] : [message, error]));
}

/** RevenueCat só roda em iOS/Android. */
export function isPurchasesSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/** `true` quando o binário nativo inclui o módulo RNPurchases (dev build / release). */
export function isNativePurchasesAvailable(): boolean {
  return Boolean(NativeModules.RNPurchases);
}

/** `true` quando o binário inclui os módulos do RevenueCat UI (RNPaywalls / Customer Center). */
export function isNativePurchasesUiAvailable(): boolean {
  return Boolean(NativeModules.RNPaywalls);
}

/** Configura o SDK uma única vez. Idempotente — seguro chamar no boot. */
export function initPurchases(): void {
  if (configured || !isPurchasesSupported()) return;
  if (!isUsableApiKey(RC_API_KEY)) {
    devWarn('[subscription] RevenueCat API key inválida para esta plataforma/build — configure pulado.');
    return;
  }
  if (!isNativePurchasesAvailable()) {
    devWarn('[subscription] Módulo nativo RNPurchases indisponível — faça prebuild e recompile o app (ex.: npm run ios).');
    return;
  }
  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    Purchases.configure({ apiKey: RC_API_KEY });
    configured = true;
  } catch (error) {
    devWarn('[subscription] Falha ao configurar RevenueCat.', error);
  }
}

/** Associa as compras a um usuário estável (ex.: e-mail/ID do backend). */
export async function loginUser(appUserId: string): Promise<CustomerInfo | null> {
  if (!configured || !isPurchasesSupported() || !appUserId) return null;
  const { customerInfo } = await Purchases.logIn(appUserId);
  return customerInfo;
}

/** Volta ao usuário anônimo (logout do app). */
export async function logoutUser(): Promise<void> {
  if (!configured || !isPurchasesSupported()) return;
  try {
    await Purchases.logOut();
  } catch {
    // Já estava anônimo — sem ação.
  }
}

/** Lê as informações atuais do cliente (entitlements, compras, etc.). */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!configured || !isPurchasesSupported()) return null;
  return Purchases.getCustomerInfo();
}

/** `true` se o entitlement "Flowly Pro" está ativo. */
export function hasProEntitlement(info: CustomerInfo | null | undefined): boolean {
  return Boolean(info?.entitlements.active[ENTITLEMENT_ID]);
}

/** Offering atual configurado no dashboard (packages para o paywall). */
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!configured || !isPurchasesSupported()) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

/** Efetua a compra de um package. Lança em caso de erro/cancelamento. */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

/** Restaura compras anteriores do usuário. */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!configured || !isPurchasesSupported()) return null;
  return Purchases.restorePurchases();
}

/**
 * Verifica a elegibilidade do usuário à oferta introdutória (trial) de cada
 * produto. iOS-only — no Android/web (ou sem SDK) retorna `{}`. Quando o SDK
 * não consegue determinar, o status vem como `UNKNOWN` e a UI deve exibir o
 * preço cheio (não anunciar "grátis") para não repetir o problema de review.
 */
export async function checkIntroEligibility(productIds: string[]): Promise<Record<string, INTRO_ELIGIBILITY_STATUS>> {
  if (!configured || !isPurchasesSupported() || productIds.length === 0) return {};
  try {
    const map = await Purchases.checkTrialOrIntroductoryPriceEligibility(productIds);
    return Object.fromEntries(Object.entries(map).map(([id, entry]) => [id, entry.status]));
  } catch {
    return {};
  }
}

/**
 * Escuta atualizações de `CustomerInfo` (renovações, expiração, restore).
 * Retorna uma função de cleanup.
 */
export function addCustomerInfoListener(listener: (info: CustomerInfo) => void): () => void {
  if (!configured || !isPurchasesSupported()) return () => undefined;
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
