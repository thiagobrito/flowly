import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFeatureFlags } from '@/lib/featureFlags';
import type { SubscriptionPlanId } from '@/lib/subscription';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription';
import { track } from '@/lib/telemetry';

import IllustrationHeader from './components/IllustrationHeader';
import LegalLinks from './components/LegalLinks';
import PlanToggle from './components/PlanToggle';
import TrialTimeline from './components/TrialTimeline';
import { usePurchaseFlow } from './usePurchaseFlow';

type SubscriptionProps = {
  onClose: () => void;
  onDevBypass?: () => void;
  /** De onde a tela foi aberta, para separar os números na telemetria. */
  source?: string;
};

function Background({ isDark }: { isDark: boolean }) {
  return <LinearGradient colors={isDark ? ['#0b1220', '#070b14', '#000000'] : ['#cfe3f5', '#eaf1f8', '#f7f8fa']} locations={[0, 0.45, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />;
}

export default function Subscription({ onClose, onDevBypass, source = 'onboarding' }: SubscriptionProps) {
  const isDark = useColorScheme() === 'dark';
  const { trialDays } = useFeatureFlags();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>('flowly_yearly');
  const { busy, introFor, showsFreeTrialFor, perMonthLabelFor, priceLabelFor, purchase, restore } = usePurchaseFlow({ onDevBypass, source });

  useEffect(() => {
    track('paywall_viewed', { step_id: 'default', source });
  }, [source]);

  const yearly = SUBSCRIPTION_PLANS.flowly_yearly;
  const monthly = SUBSCRIPTION_PLANS.flowly_montly;

  const introInfo = introFor(selectedPlan);
  const showFreeTrial = showsFreeTrialFor(selectedPlan);

  const yearlyPriceLabel = priceLabelFor('flowly_yearly');
  const monthlyPriceLabel = priceLabelFor('flowly_montly');
  const yearlyPerMonth = perMonthLabelFor('flowly_yearly');

  const pricingSubtitle = useMemo(() => {
    const trialPrefix = showFreeTrial && introInfo ? `Primeiros ${introInfo.label} grátis, depois ` : '';
    if (selectedPlan === 'flowly_yearly') {
      return `${trialPrefix || 'Assine por '}${yearlyPriceLabel} (${yearlyPerMonth}/mês)`;
    }
    return `${trialPrefix || 'Assine por '}${monthlyPriceLabel}/mês`;
  }, [introInfo, monthlyPriceLabel, selectedPlan, showFreeTrial, yearlyPerMonth, yearlyPriceLabel]);

  const planDetails = useMemo(() => {
    if (selectedPlan === 'flowly_yearly') {
      return `Flowly Premium ${yearly.title} · 12 meses · ${yearlyPriceLabel}/ano (${yearlyPerMonth}/mês)`;
    }
    return `Flowly Premium ${monthly.title} · 1 mês · ${monthlyPriceLabel}/mês`;
  }, [monthly.title, monthlyPriceLabel, selectedPlan, yearly.title, yearlyPerMonth, yearlyPriceLabel]);

  const ctaLabel = showFreeTrial ? 'Começar teste grátis' : 'Assinar agora';
  const headerTitle = showFreeTrial ? 'Como o teste funciona' : 'Desbloqueie o Flowly Premium';

  const handleSubscribe = async () => {
    const outcome = await purchase(selectedPlan);
    if (outcome.status === 'success') onClose();
  };

  const handleRestore = async () => {
    const outcome = await restore();
    if (outcome.status === 'success') onClose();
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
              {headerTitle}
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

          {/* A oferta da loja manda; sem ela, cai na duração divulgada pelo servidor. */}
          <TrialTimeline isDark={isDark} hasFreeTrial={showFreeTrial} trialDays={introInfo?.periodDays ?? trialDays} />
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
              {busy ? <ActivityIndicator color="#ffffff" /> : <Text className="text-base font-semibold text-white">{ctaLabel}</Text>}
            </LinearGradient>
          </Pressable>

          <LegalLinks isDark={isDark} />
        </View>
      </SafeAreaView>
    </View>
  );
}
