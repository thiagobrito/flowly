import { LinearGradient } from 'expo-linear-gradient';
import { Check, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFeatureFlags } from '@/lib/featureFlags';
import type { OfferStep, SubscriptionPlanId } from '@/lib/subscription';

import IllustrationHeader from '../components/IllustrationHeader';
import LegalLinks from '../components/LegalLinks';
import PlanToggle from '../components/PlanToggle';
import TrialTimeline from '../components/TrialTimeline';
import type { PurchaseFlow } from '../usePurchaseFlow';
import { PREMIUM_BENEFITS } from './benefits';
import Countdown from './Countdown';

type FullOfferProps = {
  step: OfferStep;
  flow: PurchaseFlow;
  /** Preço cheio do plano anual, usado no "de/por" das ofertas com desconto. */
  basePriceLabel: string | null;
  onSubscribe: (plan: SubscriptionPlanId) => void;
  onDismiss: () => void;
  onRestore: () => void;
};

function Background({ isDark }: { isDark: boolean }) {
  return <LinearGradient colors={isDark ? ['#0b1220', '#070b14', '#000000'] : ['#cfe3f5', '#eaf1f8', '#f7f8fa']} locations={[0, 0.45, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />;
}

/** Oferta em tela cheia: primeiro contato (preço cheio) e oferta final. */
export default function FullOffer({ step, flow, basePriceLabel, onSubscribe, onDismiss, onRestore }: FullOfferProps) {
  const isDark = useColorScheme() === 'dark';
  const { trialDays } = useFeatureFlags();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>(step.plan);

  const plan = step.showPlanToggle ? selectedPlan : step.plan;
  const priceLabel = flow.priceLabelFor(plan);
  const perMonthLabel = flow.perMonthLabelFor(plan);
  const intro = flow.introFor(plan);
  const showFreeTrial = flow.showsFreeTrialFor(plan);
  const isDiscounted = Boolean(step.discountLabel);
  /** Só faz sentido riscar um preço diferente do que está sendo cobrado. */
  const showStrikethrough = isDiscounted && Boolean(basePriceLabel) && basePriceLabel !== priceLabel;

  const titleColor = isDark ? '#fafafa' : '#18181b';
  const subtitleColor = isDark ? '#d4d4d8' : '#52525b';
  const mutedColor = isDark ? '#71717a' : '#a1a1aa';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.75)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

  const ctaLabel = showFreeTrial ? 'Começar teste grátis' : step.ctaLabel;
  const periodLabel = plan === 'flowly_yearly' ? 'ano' : 'mês';

  let pricingCaption: string;
  if (showFreeTrial && intro) {
    pricingCaption = `Primeiros ${intro.label} grátis, depois ${priceLabel}/${periodLabel}.`;
  } else {
    pricingCaption = `${priceLabel} cobrados hoje. Renova todo ${periodLabel}. Cancele quando quiser.`;
  }

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <Background isDark={isDark} />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="absolute right-4 top-14 z-10">
          <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Fechar" className="size-10 items-center justify-center rounded-full bg-white/40 active:opacity-70">
            <X size={20} color="white" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <IllustrationHeader />

          <View className="px-6 pt-6">
            {step.badge ? (
              <View className="mb-3 self-center rounded-full px-3 py-1" style={{ backgroundColor: isDiscounted ? '#f97316' : '#6366f1' }}>
                <Text className="text-[11px] font-bold tracking-wide text-white">{step.badge}</Text>
              </View>
            ) : null}

            <Text className="text-center text-2xl font-bold" style={{ color: titleColor }}>
              {step.title}
            </Text>
            <Text className="mt-2 text-center text-sm leading-5" style={{ color: subtitleColor }}>
              {step.subtitle}
            </Text>

            {step.countdownSeconds ? (
              <View className="mt-5 rounded-2xl border p-4" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                <Text className="mb-3 text-center text-xs" style={{ color: subtitleColor }}>
                  A oferta termina em:
                </Text>
                <Countdown seconds={step.countdownSeconds} isDark={isDark} onExpire={onDismiss} variant="blocks" />
              </View>
            ) : null}

            {step.showPlanToggle ? (
              <View className="mt-6">
                <PlanToggle value={selectedPlan} onChange={setSelectedPlan} isDark={isDark} />
              </View>
            ) : null}

            <View className="mt-6 items-center">
              {step.discountLabel ? (
                <View className="mb-2 rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(249,115,22,0.15)' }}>
                  <Text className="text-sm font-bold" style={{ color: '#f97316' }}>
                    {step.discountLabel}
                  </Text>
                </View>
              ) : null}

              <View className="flex-row items-baseline">
                {showStrikethrough ? (
                  <Text className="mr-2 text-base line-through" style={{ color: mutedColor }}>
                    {basePriceLabel}
                  </Text>
                ) : null}
                <Text className="text-3xl font-bold" style={{ color: titleColor }}>
                  {priceLabel}
                </Text>
              </View>

              <Text className="mt-1 text-sm" style={{ color: subtitleColor }}>
                {perMonthLabel}/mês
              </Text>
            </View>

            {isDiscounted ? (
              <View className="mt-6 gap-2">
                {PREMIUM_BENEFITS.map((benefit) => (
                  <View key={benefit} className="flex-row items-center">
                    <View className="size-6 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(34,197,94,0.16)' }}>
                      <Check size={14} color="#22c55e" strokeWidth={3} />
                    </View>
                    <Text className="ml-3 flex-1 text-[15px] leading-5" style={{ color: subtitleColor }}>
                      {benefit}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {/* A oferta da loja manda; sem ela, cai na duração divulgada pelo servidor. */}
          <TrialTimeline isDark={isDark} hasFreeTrial={showFreeTrial} trialDays={intro?.periodDays ?? trialDays} />
        </ScrollView>

        <View className="px-6 pb-2 pt-3">
          <Pressable onPress={onRestore} disabled={flow.busy} accessibilityRole="button" className="mb-3 active:opacity-70">
            <Text className="text-center text-sm" style={{ color: mutedColor }}>
              Restaurar compra
            </Text>
          </Pressable>

          <Pressable onPress={() => onSubscribe(plan)} disabled={flow.busy} accessibilityRole="button" className="active:opacity-90" style={{ opacity: flow.busy ? 0.7 : 1 }}>
            <LinearGradient
              colors={isDiscounted ? ['#f97316', '#ea580c'] : ['#3b82f6', '#6366f1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                height: 52,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: isDiscounted ? '#f97316' : '#6366f1',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 14,
                elevation: 8,
              }}
            >
              {flow.busy ? <ActivityIndicator color="#ffffff" /> : <Text className="text-base font-semibold text-white">{ctaLabel}</Text>}
            </LinearGradient>
          </Pressable>

          <Text className="mt-3 text-center text-xs leading-4" style={{ color: mutedColor }}>
            {pricingCaption}
          </Text>

          <Pressable onPress={onDismiss} disabled={flow.busy} accessibilityRole="button" className="mt-2 active:opacity-70">
            <Text className="text-center text-sm underline" style={{ color: subtitleColor }}>
              {step.dismissLabel}
            </Text>
          </Pressable>

          <LegalLinks isDark={isDark} />
        </View>
      </SafeAreaView>
    </View>
  );
}
