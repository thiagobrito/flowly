import * as Sentry from '@sentry/react-native';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, useColorScheme, View } from 'react-native';
import type { CustomerInfo, PurchasesError, PurchasesStoreTransaction } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

import { initPurchases, isNativePurchasesUiAvailable, isPurchasesSupported, useSubscription } from '@/lib/subscription';

type PaywallProps = {
  /** Chamado ao concluir compra/restore ou ao fechar o paywall. */
  onClose: () => void;
  /** Em dev, permite seguir sem assinatura quando o binário não inclui RevenueCat. */
  onDevBypass?: () => void;
};

function PurchasesUnavailableFallback({ onDevBypass }: { onDevBypass?: () => void }) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-8 dark:bg-black">
      <Text className="text-center text-base font-medium text-zinc-800 dark:text-zinc-100">Assinaturas indisponíveis neste build</Text>
      <Text className="mt-3 text-center text-sm text-zinc-600 dark:text-zinc-400">Recompile o app para incluir o RevenueCat: npm run ios</Text>
      {onDevBypass ? (
        <Pressable className="mt-6 rounded-lg bg-indigo-600 px-6 py-3" onPress={onDevBypass}>
          <Text className="text-center text-sm font-medium text-white">Continuar em modo dev</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Paywall do RevenueCat (configurado remotamente no dashboard). Os preços e o
 * layout vêm do offering "current"; aqui apenas tratamos o resultado e
 * notificamos o backend via `confirmPurchase`.
 */
export default function Paywall({ onClose, onDevBypass }: PaywallProps) {
  const isDark = useColorScheme() === 'dark';
  const { confirmPurchase } = useSubscription();

  // Configura o SDK só quando o paywall realmente aparece (nunca no boot do app).
  useEffect(() => {
    initPurchases();
  }, []);

  const handlePurchaseCompleted = async ({ customerInfo, storeTransaction }: { customerInfo: CustomerInfo; storeTransaction: PurchasesStoreTransaction }) => {
    await confirmPurchase(customerInfo, storeTransaction?.transactionIdentifier ?? null);
    onClose();
  };

  const handleRestoreCompleted = async ({ customerInfo }: { customerInfo: CustomerInfo }) => {
    await confirmPurchase(customerInfo);
    onClose();
  };

  if (!isPurchasesSupported()) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8 dark:bg-black">
        <Text className="text-center text-base text-zinc-600 dark:text-zinc-300">As assinaturas só estão disponíveis no app iOS/Android.</Text>
        <ActivityIndicator className="mt-4" color={isDark ? '#e4e4e7' : '#6366f1'} />
      </View>
    );
  }

  if (!isNativePurchasesUiAvailable()) {
    return <PurchasesUnavailableFallback onDevBypass={onDevBypass} />;
  }

  return (
    <RevenueCatUI.Paywall
      style={{ flex: 1 }}
      onPurchaseCompleted={handlePurchaseCompleted}
      onRestoreCompleted={handleRestoreCompleted}
      onPurchaseError={({ error }: { error: PurchasesError }) => Sentry.captureException(error)}
      onRestoreError={({ error }: { error: PurchasesError }) => Sentry.captureException(error)}
      onDismiss={onClose}
    />
  );
}
