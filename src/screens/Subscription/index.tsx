import * as Sentry from '@sentry/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { SubscriptionPlanId } from '@/lib/subscription';
import { getCurrentOffering, initPurchases, isNativePurchasesAvailable, isPurchasesSupported, purchasePackage, restorePurchases, SUBSCRIPTION_PLANS, useSubscription } from '@/lib/subscription';

import IllustrationHeader from './components/IllustrationHeader';
import LegalLinks from './components/LegalLinks';
import PlanToggle from './components/PlanToggle';
import TrialTimeline from './components/TrialTimeline';
import { TRIAL_DAYS } from './constants';

type SubscriptionProps = {
  onClose: () => void;
  onDevBypass?: () => void;
};

function formatMonthlyEquivalent(yearlyAmount: number): string {
  return (yearlyAmount / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Background({ isDark }: { isDark: boolean }) {
  return <LinearGradient colors={isDark ? ['#0b1220', '#070b14', '#000000'] : ['#cfe3f5', '#eaf1f8', '#f7f8fa']} locations={[0, 0.45, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />;
}

export default function Subscription({ onClose, onDevBypass }: SubscriptionProps) {
  const isDark = useColorScheme() === 'dark';
  const { confirmPurchase } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>('flowly_yearly');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    initPurchases();
  }, []);

  const yearly = SUBSCRIPTION_PLANS.flowly_yearly;
  const monthly = SUBSCRIPTION_PLANS.flowly_montly;

  const pricingSubtitle = useMemo(() => {
    if (selectedPlan === 'flowly_yearly') {
      return `Primeiros ${TRIAL_DAYS} dias grátis, depois ${yearly.priceLabel} (R$ ${formatMonthlyEquivalent(yearly.amount)}/mês)`;
    }
    return `Primeiros ${TRIAL_DAYS} dias grátis, depois ${monthly.priceLabel}/mês`;
  }, [monthly.priceLabel, selectedPlan, yearly.amount, yearly.priceLabel]);

  const planDetails = useMemo(() => {
    if (selectedPlan === 'flowly_yearly') {
      return `Flowly Premium ${yearly.title} · 12 meses · ${yearly.priceLabel}/ano (R$ ${formatMonthlyEquivalent(yearly.amount)}/mês)`;
    }
    return `Flowly Premium ${monthly.title} · 1 mês · ${monthly.priceLabel}/mês`;
  }, [monthly.priceLabel, monthly.title, selectedPlan, yearly.amount, yearly.priceLabel, yearly.title]);

  const handleSubscribe = async () => {
    if (!isPurchasesSupported()) {
      Alert.alert('Indisponível', 'As assinaturas só estão disponíveis no app iOS/Android.');
      return;
    }

    if (!isNativePurchasesAvailable()) {
      if (onDevBypass) {
        onDevBypass();
        return;
      }
      Alert.alert('Indisponível', 'Recompile o app para incluir o RevenueCat: npm run ios');
      return;
    }

    setBusy(true);
    try {
      const offering = await getCurrentOffering();
      const { productId } = SUBSCRIPTION_PLANS[selectedPlan];
      const pkg = offering?.availablePackages.find((item) => item.product.identifier === productId);

      if (!pkg) {
        Alert.alert('Plano indisponível', 'Este plano não está configurado no RevenueCat.');
        return;
      }

      const info = await purchasePackage(pkg);
      await confirmPurchase(info);
      onClose();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'userCancelled' in error && (error as { userCancelled?: boolean }).userCancelled) {
        return;
      }
      Sentry.captureException(error);
      Alert.alert('Erro', 'Não foi possível concluir a assinatura.');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!isPurchasesSupported() || !isNativePurchasesAvailable()) return;

    setBusy(true);
    try {
      const info = await restorePurchases();
      if (info) {
        await confirmPurchase(info);
        onClose();
        return;
      }
      Alert.alert('Nada encontrado', 'Nenhuma compra anterior para restaurar.');
    } catch (error) {
      Sentry.captureException(error);
      Alert.alert('Erro', 'Falha ao restaurar compras.');
    } finally {
      setBusy(false);
    }
  };

  const titleColor = isDark ? '#fafafa' : '#18181b';
  const subtitleColor = isDark ? '#d4d4d8' : '#52525b';
  const mutedColor = isDark ? '#71717a' : '#a1a1aa';

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <Background isDark={isDark} />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="absolute right-4 top-14 z-10">
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" className="size-10 items-center justify-center rounded-full bg-white/40 active:opacity-70">
            <X size={20} color="white" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <IllustrationHeader />

          <View className="px-6 pt-6">
            <Text className="text-center text-2xl font-bold" style={{ color: titleColor }}>
              Como o teste funciona
            </Text>
            <Text className="mt-2 text-center text-sm leading-5" style={{ color: subtitleColor }}>
              {pricingSubtitle}
            </Text>

            <View className="mt-6">
              <PlanToggle value={selectedPlan} onChange={setSelectedPlan} isDark={isDark} />
            </View>

            <Text className="mt-3 text-center text-xs leading-4" style={{ color: mutedColor }}>
              {planDetails}
            </Text>
          </View>

          <TrialTimeline isDark={isDark} />
        </ScrollView>

        <View className="px-6 pb-2 pt-3">
          <Pressable onPress={handleRestore} disabled={busy} accessibilityRole="button" className="mb-3 active:opacity-70">
            <Text className="text-center text-sm" style={{ color: mutedColor }}>
              Restaurar compra
            </Text>
          </Pressable>

          <Text className="mb-3 text-center text-xs lowercase" style={{ color: subtitleColor }}>
            cancelar a qualquer momento
          </Text>

          <Pressable onPress={handleSubscribe} disabled={busy} accessibilityRole="button" className="active:opacity-90" style={{ opacity: busy ? 0.7 : 1 }}>
            <LinearGradient
              colors={['#3b82f6', '#6366f1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                height: 52,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#6366f1',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 14,
                elevation: 8,
              }}
            >
              {busy ? <ActivityIndicator color="#ffffff" /> : <Text className="text-base font-semibold text-white">Iniciar minha assinatura</Text>}
            </LinearGradient>
          </Pressable>

          <LegalLinks isDark={isDark} />
        </View>
      </SafeAreaView>
    </View>
  );
}
