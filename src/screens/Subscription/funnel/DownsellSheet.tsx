import { LinearGradient } from 'expo-linear-gradient';
import { Flame, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { OfferStep, SubscriptionPlanId } from '@/lib/subscription';

import type { PurchaseFlow } from '../usePurchaseFlow';
import Countdown from './Countdown';

type DownsellSheetProps = {
  step: OfferStep;
  flow: PurchaseFlow;
  /** Preço cheio do plano anual, riscado ao lado do preço com desconto. */
  basePriceLabel: string | null;
  onSubscribe: (plan: SubscriptionPlanId) => void;
  onDismiss: () => void;
};

const ANIM_DURATION = 260;

/**
 * Oferta intermediária: um cartão compacto ancorado na base, exibido sobre o
 * escurecimento da tela anterior. Não usa `Modal` porque o funil já ocupa a
 * tela inteira do gate — evita empilhar modais nativos.
 */
export default function DownsellSheet({ step, flow, basePriceLabel, onSubscribe, onDismiss }: DownsellSheetProps) {
  // Paywall sempre em dark — independente do tema do sistema.
  const isDark = true;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: ANIM_DURATION });
  }, [progress]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 48 }],
  }));

  const priceLabel = flow.priceLabelFor(step.plan);
  const perMonthLabel = flow.perMonthLabelFor(step.plan);
  const showStrikethrough = Boolean(basePriceLabel) && basePriceLabel !== priceLabel;
  const ctaDisabled = flow.busy || !flow.offeringReady;

  const sheetBg = '#171326';
  const titleColor = '#fafafa';
  const subtitleColor = '#d4d4d8';
  const mutedColor = '#a1a1aa';

  return (
    <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <Pressable className="flex-1" accessibilityRole="button" accessibilityLabel="Fechar oferta" onPress={onDismiss} />

      <Animated.View style={[sheetStyle, { backgroundColor: sheetBg, borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}>
        <SafeAreaView edges={['bottom']}>
          <View className="px-6 pb-4 pt-5">
            <View className="mb-5 h-1 w-10 self-center rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />

            <View className="flex-row items-center justify-between">
              {step.countdownSeconds ? <Countdown seconds={step.countdownSeconds} isDark={isDark} onExpire={onDismiss} /> : <View />}

              <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Fechar" className="size-9 items-center justify-center rounded-full active:opacity-70" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <X size={18} color={mutedColor} />
              </Pressable>
            </View>

            <View className="mt-5 flex-row items-center justify-center">
              <View className="size-12 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}>
                <Flame size={24} color="#6366f1" />
              </View>
              <Text className="ml-3 text-4xl font-extrabold" style={{ color: titleColor }}>
                {step.discountLabel}
              </Text>
            </View>

            <Text className="mt-4 text-center text-xl font-bold" style={{ color: titleColor }}>
              {step.title}
            </Text>
            <Text className="mt-1 text-center text-sm leading-5" style={{ color: subtitleColor }}>
              {step.subtitle}
            </Text>

            <View className="mt-5 flex-row items-center justify-between rounded-2xl border px-4 py-3" style={{ borderColor: '#6366f1' }}>
              <Text className="text-xs font-bold tracking-wide" style={{ color: mutedColor }}>
                12 MESES
              </Text>

              <View className="flex-row items-baseline">
                {showStrikethrough ? (
                  <Text className="mr-2 text-sm line-through" style={{ color: mutedColor }}>
                    {basePriceLabel}
                  </Text>
                ) : null}
                <Text className="text-2xl font-bold" style={{ color: titleColor }}>
                  {perMonthLabel}
                </Text>
                <Text className="text-sm" style={{ color: subtitleColor }}>
                  /mês
                </Text>
              </View>
            </View>

            <Pressable onPress={() => onSubscribe(step.plan)} disabled={ctaDisabled} accessibilityRole="button" className="mt-5 active:opacity-90" style={{ opacity: ctaDisabled ? 0.7 : 1 }}>
              <LinearGradient colors={['#3b82f6', '#6366f1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
                {flow.busy || !flow.offeringReady ? <ActivityIndicator color="#ffffff" /> : <Text className="text-base font-bold uppercase text-white">{step.ctaLabel}</Text>}
              </LinearGradient>
            </Pressable>

            <Text className="mt-3 text-center text-xs leading-4" style={{ color: mutedColor }}>
              Total anual: {priceLabel} cobrados hoje. Renova todo ano. Cancele quando quiser.
            </Text>

            <Pressable onPress={onDismiss} disabled={flow.busy} accessibilityRole="button" className="mt-3 active:opacity-70">
              <Text className="text-center text-sm underline" style={{ color: subtitleColor }}>
                {step.dismissLabel}
              </Text>
            </Pressable>

            <Text className="mt-3 text-center text-[11px] leading-4" style={{ color: mutedColor }}>
              Com o desconto, o período de teste grátis não se aplica: a cobrança começa hoje pela App Store ou Google Play.
            </Text>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}
