import * as Sentry from '@sentry/react-native';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { getCurrentOffering, getCustomerInfo, initPurchases, isNativePurchasesAvailable, isNativePurchasesUiAvailable, isPurchasesSupported, purchasePackage, restorePurchases, useSubscription } from '@/lib/subscription';

function ensurePurchasesReady(): boolean {
  if (!isPurchasesSupported()) {
    Alert.alert('Indisponível', 'Compras só funcionam no app iOS/Android.');
    return false;
  }
  initPurchases();
  if (!isNativePurchasesAvailable()) {
    Alert.alert('Módulo nativo ausente', 'Recompile o app para incluir o RevenueCat: npm run ios');
    return false;
  }
  return true;
}

export function usePurchaseTest() {
  const { confirmPurchase, refresh } = useSubscription();
  const [busy, setBusy] = useState(false);

  const showPaywall = useCallback(async () => {
    if (!ensurePurchasesReady()) return;
    if (!isNativePurchasesUiAvailable()) {
      Alert.alert('Paywall indisponível', 'RevenueCat UI não está no build nativo.');
      return;
    }

    setBusy(true);
    try {
      const result = await RevenueCatUI.presentPaywall();
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        const info = await getCustomerInfo();
        if (info) await confirmPurchase(info);
        else await refresh();
        Alert.alert('Sucesso', 'Compra ou restore concluído.');
      }
    } catch (error) {
      Sentry.captureException(error);
      Alert.alert('Erro', 'Não foi possível abrir o paywall.');
    } finally {
      setBusy(false);
    }
  }, [confirmPurchase, refresh]);

  const purchaseProduct = useCallback(
    async (productId: string) => {
      if (!ensurePurchasesReady()) return;

      setBusy(true);
      try {
        const offering = await getCurrentOffering();
        const pkg = offering?.availablePackages.find((item) => item.product.identifier === productId);
        if (!pkg) {
          Alert.alert('Produto não encontrado', `${productId} não está no offering atual do RevenueCat.`);
          return;
        }

        const info = await purchasePackage(pkg);
        await confirmPurchase(info);
        Alert.alert('Sucesso', `Compra de ${productId} concluída.`);
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'userCancelled' in error && (error as { userCancelled?: boolean }).userCancelled) return;
        Sentry.captureException(error);
        Alert.alert('Erro', 'Compra não concluída.');
      } finally {
        setBusy(false);
      }
    },
    [confirmPurchase],
  );

  const restore = useCallback(async () => {
    if (!ensurePurchasesReady()) return;

    setBusy(true);
    try {
      const info = await restorePurchases();
      if (info) {
        await confirmPurchase(info);
        Alert.alert('Sucesso', 'Compras restauradas.');
        return;
      }
      Alert.alert('Nada encontrado', 'Nenhuma compra anterior para restaurar.');
    } catch (error) {
      Sentry.captureException(error);
      Alert.alert('Erro', 'Falha ao restaurar compras.');
    } finally {
      setBusy(false);
    }
  }, [confirmPurchase]);

  return {
    busy,
    showPaywall,
    purchaseMonthly: () => purchaseProduct('flowly_montly'),
    purchaseYearly: () => purchaseProduct('flowly_yearly'),
    restore,
  };
}
