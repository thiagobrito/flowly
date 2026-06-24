/**
 * Hook de assinatura.
 *
 * Combina o status do backend (`GET /subscription`) com o entitlement do
 * RevenueCat, mantém um cache local (`usePersistedState`) e expõe flags de
 * acesso (`isPremium`, `isTrialing`, `trialDaysLeft`). O trial de 7 dias é
 * controlado pelo backend — aqui apenas lemos e exibimos.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CustomerInfo } from 'react-native-purchases';

import { usePersistedState } from '@/lib/storage';

import { buildPaymentPayload, fetchSubscription, notifyPayment } from './api';
import { addCustomerInfoListener, getCustomerInfo, hasProEntitlement } from './client';
import type { SubscriptionCache } from './types';

const SUBSCRIPTION_KEY = 'subscription_v1';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const EMPTY: SubscriptionCache = {
  status: 'none',
  isPremium: false,
  trialEndsAt: null,
  currentPeriodEnd: null,
  plan: null,
};

function computeTrialDaysLeft(trialEndsAt: string | null | undefined): number {
  if (!trialEndsAt) return 0;
  const end = new Date(trialEndsAt).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, Math.ceil((end - Date.now()) / MS_PER_DAY));
}

export function useSubscription() {
  const [cache, setCache] = usePersistedState<SubscriptionCache>(EMPTY, SUBSCRIPTION_KEY);
  const [hasSynced, setHasSynced] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mantém o último valor do cache acessível sem recriar `refresh`.
  const cacheRef = useRef(cache);
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [remoteRes, infoRes] = await Promise.allSettled([fetchSubscription(), getCustomerInfo()]);
    const rcActive = infoRes.status === 'fulfilled' ? hasProEntitlement(infoRes.value) : false;
    const base = remoteRes.status === 'fulfilled' ? remoteRes.value : cacheRef.current;

    setCache({
      status: base.status ?? 'none',
      isPremium: Boolean(base.isPremium) || rcActive,
      trialEndsAt: base.trialEndsAt ?? null,
      currentPeriodEnd: base.currentPeriodEnd ?? null,
      plan: base.plan ?? null,
    });
    setHasSynced(true);
    setLoading(false);
  }, [setCache]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Reage a renovações/expirações/restore vindas do RevenueCat.
  useEffect(() => addCustomerInfoListener(() => refresh()), [refresh]);

  /** Confirma uma compra concluída: notifica o backend e re-sincroniza. */
  const confirmPurchase = useCallback(
    async (info: CustomerInfo, transactionId?: string | null) => {
      const payload = buildPaymentPayload(info, transactionId);
      if (payload) {
        try {
          await notifyPayment(payload);
        } catch {
          // O refresh abaixo reconcilia o estado mesmo se a notificação falhar.
        }
      }
      await refresh();
    },
    [refresh],
  );

  const trialDaysLeft = useMemo(() => computeTrialDaysLeft(cache.trialEndsAt), [cache.trialEndsAt]);
  const isTrialing = cache.status === 'trial' && trialDaysLeft > 0;
  const isPremium = Boolean(cache.isPremium) || isTrialing;

  return {
    status: cache,
    isPremium,
    isTrialing,
    trialDaysLeft,
    loading,
    /** `true` após hidratar o cache e completar a primeira sincronização. */
    isReady: Boolean(cache.loaded) && hasSynced,
    refresh,
    confirmPurchase,
  };
}
