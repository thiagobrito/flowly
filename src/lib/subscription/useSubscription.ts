/**
 * Hook de assinatura.
 *
 * O banco é a autoridade sobre o modo de funcionamento do app: `GET /subscription`
 * devolve trial/assinatura e este hook só reflete o resultado, mantendo um cache
 * local (`usePersistedState`) para funcionar offline. O cache tem prazo de
 * validade (`OFFLINE_GRACE_DAYS`) — sem falar com o servidor por mais que isso,
 * ele deixa de conceder acesso. O entitlement do RevenueCat entra como rede de
 * segurança para quem acabou de comprar e o banco ainda não sabe.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CustomerInfo } from 'react-native-purchases';

import { usePersistedState } from '@/lib/storage';

import { buildPaymentPayload, fetchSubscription, notifyPayment } from './api';
import { addCustomerInfoListener, getCustomerInfo, hasProEntitlement } from './client';
import type { SubscriptionCache, SubscriptionStatusValue } from './types';

const SUBSCRIPTION_KEY = 'subscription_v1';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Por quantos dias um cache sem sincronizar ainda concede acesso. */
const OFFLINE_GRACE_DAYS = 7;

const EMPTY: SubscriptionCache = {
  status: 'none',
  isPremium: false,
  trialEndsAt: null,
  currentPeriodEnd: null,
  plan: null,
  syncedAt: null,
};

function toTimestamp(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const parsed = new Date(iso).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function daysLeftUntil(iso: string | null | undefined, now: number): number {
  const end = toTimestamp(iso);
  if (end === null) return 0;
  return Math.max(0, Math.ceil((end - now) / MS_PER_DAY));
}

/**
 * Reavalia o cache contra o relógio atual — mesma regra do `resolveStatus` do
 * backend. Sem isso um cache gravado como `trial` continuaria liberando o app
 * depois do trial ter vencido, enquanto o usuário estivesse offline.
 */
function resolveCachedAccess(cache: SubscriptionCache, now: number): { status: SubscriptionStatusValue; isPremium: boolean } {
  const periodEnd = toTimestamp(cache.currentPeriodEnd);
  const trialEnd = toTimestamp(cache.trialEndsAt);

  if (periodEnd !== null && periodEnd > now) return { status: 'active', isPremium: true };
  if (trialEnd !== null && trialEnd > now) return { status: 'trial', isPremium: true };
  if (periodEnd !== null || trialEnd !== null) return { status: 'expired', isPremium: false };

  return { status: cache.status ?? 'none', isPremium: Boolean(cache.isPremium) };
}

export function useSubscription() {
  const [cache, setCache] = usePersistedState<SubscriptionCache>(EMPTY, SUBSCRIPTION_KEY);
  const [storeActive, setStoreActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mantém o último valor do cache acessível sem recriar `refresh`.
  const cacheRef = useRef(cache);
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [remoteRes, infoRes] = await Promise.allSettled([fetchSubscription(), getCustomerInfo()]);

    const info = infoRes.status === 'fulfilled' ? infoRes.value : null;
    const entitlementActive = hasProEntitlement(info);
    setStoreActive(entitlementActive);

    // Falha de rede não mexe no cache nem em `syncedAt`: é exatamente o que faz
    // a carência offline correr.
    if (remoteRes.status === 'fulfilled' && remoteRes.value) {
      const remote = remoteRes.value;

      setCache({
        status: remote.status ?? 'none',
        isPremium: Boolean(remote.isPremium),
        trialEndsAt: remote.trialEndsAt ?? null,
        currentPeriodEnd: remote.currentPeriodEnd ?? null,
        plan: remote.plan ?? null,
        syncedAt: new Date().toISOString(),
      });

      // A loja já liberou o acesso mas o banco ainda não sabe (webhook atrasado
      // ou compra feita offline): empurra a compra para o servidor. O próximo
      // refresh reconcilia — não re-sincronizamos aqui para não criar laço.
      if (entitlementActive && !remote.isPremium && info) {
        const payload = buildPaymentPayload(info);
        if (payload) notifyPayment(payload).catch(() => undefined);
      }
    }

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

  const access = useMemo(() => {
    const now = Date.now();
    const syncedAt = toTimestamp(cache.syncedAt);
    const withinGrace = syncedAt !== null && now - syncedAt <= OFFLINE_GRACE_DAYS * MS_PER_DAY;
    const cached = resolveCachedAccess(cache, now);

    return {
      status: cached.status,
      isPremium: (withinGrace && cached.isPremium) || storeActive,
      isTrialing: withinGrace && cached.status === 'trial',
      trialDaysLeft: daysLeftUntil(cache.trialEndsAt, now),
      /** Nunca sincronizou: melhor liberar o app do que bloquear sem saber. */
      hasServerAnswer: syncedAt !== null,
    };
  }, [cache, storeActive]);

  return {
    status: cache,
    isPremium: access.isPremium,
    isTrialing: access.isTrialing,
    trialDaysLeft: access.trialDaysLeft,
    loading,
    /** `true` após hidratar o cache e ter alguma resposta do servidor (mesmo antiga). */
    isReady: Boolean(cache.loaded) && access.hasServerAnswer,
    refresh,
    confirmPurchase,
  };
}
