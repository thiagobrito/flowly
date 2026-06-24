import * as Sentry from '@sentry/react-native';
import { ActivityIndicator, Text, useColorScheme, View } from 'react-native';
import type { CustomerInfo, PurchasesError, PurchasesStoreTransaction } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

import { isPurchasesSupported, useSubscription } from '@/lib/subscription';

type PaywallProps = {
  /** Chamado ao concluir compra/restore ou ao fechar o paywall. */
  onClose: () => void;
};

/**
 * Paywall do RevenueCat (configurado remotamente no dashboard). Os preços e o
 * layout vêm do offering "current"; aqui apenas tratamos o resultado e
 * notificamos o backend via `confirmPurchase`.
 */
export default function Paywall({ onClose }: PaywallProps) {
  const isDark = useColorScheme() === 'dark';
  const { confirmPurchase } = useSubscription();

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
