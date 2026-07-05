/**
 * # Subscription library
 *
 * Camada de assinatura premium sobre o RevenueCat (`react-native-purchases`) +
 * backend Flowly. Segue o padrão lib-fina + hook do projeto (como `auth/`).
 *
 * ## Setup (uma vez, no boot)
 *
 * ```ts
 * import { initPurchases } from '@/lib/subscription';
 * initPurchases();
 * ```
 *
 * ## Vincular ao usuário (login/logout)
 *
 * ```ts
 * import { loginUser, logoutUser } from '@/lib/subscription';
 * await loginUser(userEmail); // após login
 * await logoutUser();         // no logout
 * ```
 *
 * ## Estado e gating na UI
 *
 * ```tsx
 * import { useSubscription } from '@/lib/subscription';
 *
 * const { isReady, isPremium, isTrialing, trialDaysLeft } = useSubscription();
 * if (isReady && !isPremium) return <Paywall />;
 * ```
 *
 * ## Paywall e Customer Center
 *
 * A UI usa `react-native-purchases-ui` (`RevenueCatUI.Paywall`,
 * `presentPaywall`, `presentCustomerCenter`). Após uma compra, chame
 * `confirmPurchase(customerInfo)` (do hook) para notificar
 * `POST /subscription/payment` e re-sincronizar.
 *
 * ## Exports principais
 *
 * - `initPurchases`, `loginUser`, `logoutUser` — ciclo de vida do SDK
 * - `useSubscription` — hook de estado + ações
 * - `getCustomerInfo`, `getCurrentOffering`, `purchasePackage`, `restorePurchases`
 * - `hasProEntitlement`, `isPurchasesSupported`
 * - `fetchSubscription`, `notifyPayment`, `buildPaymentPayload`
 * - `SUBSCRIPTION_PLANS`, `ENTITLEMENT_ID`, `RC_API_KEY`, `resolvePlanId`
 */

export { buildPaymentPayload, fetchSubscription, notifyPayment } from './api';
export {
  addCustomerInfoListener,
  checkIntroEligibility,
  getCurrentOffering,
  getCustomerInfo,
  hasProEntitlement,
  initPurchases,
  isNativePurchasesAvailable,
  isNativePurchasesUiAvailable,
  isPurchasesSupported,
  loginUser,
  logoutUser,
  purchasePackage,
  restorePurchases,
} from './client';
export { describeIntroOffer, ENTITLEMENT_ID, RC_API_KEY, resolvePlanId, SUBSCRIPTION_PLANS } from './config';
export { useLocalTrial } from './trial';
export type { PaymentPayload, SubscriptionCache, SubscriptionPlan, SubscriptionPlanId, SubscriptionStatus, SubscriptionStatusValue } from './types';
export { useSubscription } from './useSubscription';
