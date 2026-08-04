/**
 * Lógica de compra compartilhada pelas telas de paywall.
 *
 * Carrega o Offering (o atual ou um específico do funil de ofertas), resolve
 * preços/elegibilidade de trial e executa compra e restauração. As telas ficam
 * só com a apresentação; o resultado de cada tentativa volta tipado para quem
 * chamou decidir o que fazer (avançar o funil, registrar telemetria etc.).
 */

import * as Sentry from '@sentry/react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { INTRO_ELIGIBILITY_STATUS, type PurchasesOffering, type PurchasesPackage } from 'react-native-purchases';

import type { IntroOfferInfo, SubscriptionPlanId } from '@/lib/subscription';
import { checkIntroEligibility, describeIntroOffer, getCurrentOffering, getOffering, initPurchases, isNativePurchasesAvailable, isPurchasesSupported, purchasePackage, restorePurchases, SUBSCRIPTION_PLANS, useSubscription } from '@/lib/subscription';
import { track } from '@/lib/telemetry';

export type PurchaseOutcome =
  | { status: 'success' }
  | { status: 'cancelled' }
  /** Ambiente não permite comprar (web, build sem módulo nativo, plano ausente). */
  | { status: 'unavailable'; reason: 'platform' | 'native' | 'package' }
  | { status: 'error'; code: string };

export type RestoreOutcome = { status: 'success' } | { status: 'empty' } | { status: 'error'; code: string };

type PurchaseFlowOptions = {
  /** Offering do funil. Ausente = offering atual do dashboard. */
  offeringId?: string;
  /** Product ID preferido deste passo (ex.: `flowly_yearly_20`). */
  preferredProductId?: string;
  /** Preço de fallback quando a loja ainda não devolveu o package. */
  fallbackPriceLabel?: string;
  /** Valor numérico do passo, usado no equivalente mensal sem package da loja. */
  fallbackAmount?: number;
  /** Passo do funil, usado na telemetria de checkout. */
  stepId?: string;
  /** De onde o paywall foi aberto (`gate`, `onboarding`, ...). */
  source?: string;
  /** Libera o app sem compra em builds de desenvolvimento sem módulo nativo. */
  onDevBypass?: () => void;
};

/**
 * iOS resolve a elegibilidade real; Android sempre retorna UNKNOWN e a loja já
 * aplica o trial apenas a quem é elegível — por isso aceitamos exibir a oferta
 * no Android quando o produto tem trial. No iOS só anunciamos "grátis" com
 * status ELIGIBLE explícito (UNKNOWN → mostra preço cheio).
 */
function isTrialEligible(status: INTRO_ELIGIBILITY_STATUS | undefined): boolean {
  if (status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE) return true;
  if (Platform.OS === 'android') {
    return status === undefined || status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_UNKNOWN;
  }
  return false;
}

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const { code } = error as { code?: unknown };
    if (typeof code === 'string' || typeof code === 'number') return String(code);
  }
  return 'unknown';
}

function isUserCancelled(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'userCancelled' in error && (error as { userCancelled?: boolean }).userCancelled);
}

function formatMonthlyEquivalent(yearlyAmount: number): string {
  return (yearlyAmount / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Reconhece o período do produto pelo identificador da loja. */
function matchesPeriod(productId: string, period: 'month' | 'year'): boolean {
  const id = productId.toLowerCase();
  if (period === 'year') return id.includes('year') || id.includes('annual') || id.includes('anual');
  return id.includes('mont') || id.includes('month') || id.includes('mensal');
}

/**
 * Resolve o package do plano no offering atual.
 *
 * Quando há `preferredProductId` do mesmo período do plano (SKU do passo do
 * funil), a busca é estrita: se o SKU não estiver no offering, retorna `null`
 * em vez de cair no preço cheio. Assim o fallback de preço do passo aparece e
 * a compra nunca cobra um valor diferente do anunciado.
 */
function resolvePackage(packages: PurchasesPackage[], planId: SubscriptionPlanId, preferredProductId?: string): PurchasesPackage | null {
  const { productId, period } = SUBSCRIPTION_PLANS[planId];

  if (preferredProductId && matchesPeriod(preferredProductId, period)) {
    return packages.find((item) => item.product.identifier === preferredProductId) ?? null;
  }

  const exact = packages.find((item) => item.product.identifier === productId);
  if (exact) return exact;

  return packages.find((item) => matchesPeriod(item.product.identifier, period)) ?? null;
}

export function usePurchaseFlow({ offeringId, preferredProductId, fallbackPriceLabel, fallbackAmount, stepId = 'default', source = 'gate', onDevBypass }: PurchaseFlowOptions = {}) {
  const { confirmPurchase } = useSubscription();
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [eligibility, setEligibility] = useState<Record<string, INTRO_ELIGIBILITY_STATUS>>({});
  const [busy, setBusy] = useState(false);
  /** `false` enquanto o offering pedido ainda não terminou de carregar. */
  const [offeringReady, setOfferingReady] = useState(false);
  /** `false` quando o identificador pedido não existe no dashboard (caiu no fallback). */
  const [offeringResolved, setOfferingResolved] = useState(true);

  useEffect(() => {
    initPurchases();

    // Limpa o offering anterior antes de buscar o novo — evita que a UI e a
    // compra usem packages do passo anterior no instante da troca.
    setOffering(null);
    setEligibility({});
    setOfferingReady(false);
    setOfferingResolved(true);

    let active = true;
    (async () => {
      try {
        const current = offeringId ? await getOffering(offeringId) : await getCurrentOffering();
        if (!active) return;

        const resolved = !offeringId || current?.identifier === offeringId;
        setOffering(current);
        setOfferingResolved(resolved);
        setOfferingReady(true);

        // Offering pedido não existe no dashboard: a oferta caiu no fallback e
        // alguém precisa publicá-la. Sem esse evento a falha é invisível.
        if (!resolved && offeringId) track('offering_missing', { offering_id: offeringId, step_id: stepId });

        const productIds = current?.availablePackages.map((item) => item.product.identifier) ?? [];
        const elig = await checkIntroEligibility(productIds);
        if (active) setEligibility(elig);
      } catch (error) {
        Sentry.captureException(error);
        if (active) setOfferingReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [offeringId, stepId]);

  const findPackage = useCallback(
    (planId: SubscriptionPlanId): PurchasesPackage | null => {
      const packages = offering?.availablePackages ?? [];
      return resolvePackage(packages, planId, preferredProductId);
    },
    [offering, preferredProductId],
  );

  /** Preço da loja; senão, o fallback do passo do funil ou o rótulo do plano. */
  const priceLabelFor = useCallback((planId: SubscriptionPlanId): string => findPackage(planId)?.product.priceString ?? fallbackPriceLabel ?? SUBSCRIPTION_PLANS[planId].priceLabel, [fallbackPriceLabel, findPackage]);

  const perMonthLabelFor = useCallback(
    (planId: SubscriptionPlanId): string => {
      const pkg = findPackage(planId);
      if (pkg?.product.pricePerMonthString) return pkg.product.pricePerMonthString;
      const { amount, period } = SUBSCRIPTION_PLANS[planId];
      const value = fallbackAmount ?? amount;
      return `R$ ${period === 'year' ? formatMonthlyEquivalent(value) : value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },
    [fallbackAmount, findPackage],
  );

  const introFor = useCallback((planId: SubscriptionPlanId): IntroOfferInfo | null => describeIntroOffer(findPackage(planId)?.product.introPrice), [findPackage]);

  const showsFreeTrialFor = useCallback(
    (planId: SubscriptionPlanId): boolean => {
      const pkg = findPackage(planId);
      if (!pkg) return false;
      return Boolean(describeIntroOffer(pkg.product.introPrice)?.isFree) && isTrialEligible(eligibility[pkg.product.identifier]);
    },
    [eligibility, findPackage],
  );

  const purchase = useCallback(
    async (planId: SubscriptionPlanId): Promise<PurchaseOutcome> => {
      const context = { step_id: stepId, source, plan: planId };
      track('checkout_started', context);

      if (!isPurchasesSupported()) {
        Alert.alert('Indisponível', 'As assinaturas só estão disponíveis no app iOS/Android.');
        track('purchase_failed', { ...context, code: 'unsupported_platform' });
        return { status: 'unavailable', reason: 'platform' };
      }

      if (!isNativePurchasesAvailable()) {
        if (onDevBypass) {
          onDevBypass();
          return { status: 'unavailable', reason: 'native' };
        }
        Alert.alert('Indisponível', 'Recompile o app para incluir o RevenueCat: npm run ios');
        track('purchase_failed', { ...context, code: 'native_module_missing' });
        return { status: 'unavailable', reason: 'native' };
      }

      setBusy(true);
      try {
        let pkg = findPackage(planId);
        if (!pkg) {
          // Offering pode não ter carregado ainda: tenta uma última resolução.
          const current = offeringId ? await getOffering(offeringId) : await getCurrentOffering();
          setOffering(current);
          const packages = current?.availablePackages ?? [];
          pkg = resolvePackage(packages, planId, preferredProductId);
        }

        if (!pkg) {
          Alert.alert('Plano indisponível', 'Este plano não está configurado no RevenueCat.');
          track('purchase_failed', { ...context, code: 'package_missing' });
          return { status: 'unavailable', reason: 'package' };
        }

        const info = await purchasePackage(pkg);
        await confirmPurchase(info);
        track('purchase_succeeded', { ...context, product_id: pkg.product.identifier });
        return { status: 'success' };
      } catch (error: unknown) {
        if (isUserCancelled(error)) {
          track('purchase_cancelled', context);
          return { status: 'cancelled' };
        }
        Sentry.captureException(error);
        Alert.alert('Erro', 'Não foi possível concluir a assinatura.');
        track('purchase_failed', { ...context, code: errorCode(error) });
        return { status: 'error', code: errorCode(error) };
      } finally {
        setBusy(false);
      }
    },
    [confirmPurchase, findPackage, offeringId, onDevBypass, preferredProductId, source, stepId],
  );

  const restore = useCallback(async (): Promise<RestoreOutcome> => {
    if (!isPurchasesSupported() || !isNativePurchasesAvailable()) return { status: 'empty' };

    setBusy(true);
    try {
      const info = await restorePurchases();
      if (info) {
        await confirmPurchase(info);
        return { status: 'success' };
      }
      Alert.alert('Nada encontrado', 'Nenhuma compra anterior para restaurar.');
      return { status: 'empty' };
    } catch (error) {
      Sentry.captureException(error);
      Alert.alert('Erro', 'Falha ao restaurar compras.');
      track('restore_failed', { step_id: stepId, code: errorCode(error) });
      return { status: 'error', code: errorCode(error) };
    } finally {
      setBusy(false);
    }
  }, [confirmPurchase, stepId]);

  return useMemo(
    () => ({
      offering,
      offeringReady,
      offeringResolved,
      busy,
      findPackage,
      priceLabelFor,
      perMonthLabelFor,
      introFor,
      showsFreeTrialFor,
      purchase,
      restore,
    }),
    [busy, findPackage, introFor, offering, offeringReady, offeringResolved, perMonthLabelFor, priceLabelFor, purchase, restore, showsFreeTrialFor],
  );
}

/** Estado e ações de compra, como consumidos pelas telas de paywall. */
export type PurchaseFlow = ReturnType<typeof usePurchaseFlow>;
