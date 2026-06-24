import * as Sentry from '@sentry/react-native';
import { ChevronRight, Crown } from 'lucide-react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { getCustomerInfo, isNativePurchasesUiAvailable, isPurchasesSupported, SUBSCRIPTION_PLANS, useSubscription } from '@/lib/subscription';

import Card from './components/Card';
import SectionTitle from './components/SectionTitle';
import SettingsRow from './components/SettingsRow';

function describeStatus({ isPremium, isTrialing, trialDaysLeft, plan }: { isPremium: boolean; isTrialing: boolean; trialDaysLeft: number; plan: keyof typeof SUBSCRIPTION_PLANS | null | undefined }): string {
  if (isTrialing) {
    return `Período de teste — ${trialDaysLeft} ${trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'}`;
  }
  if (isPremium) {
    const title = plan ? SUBSCRIPTION_PLANS[plan].title : null;
    return title ? `Flowly Pro — ${title}` : 'Flowly Pro ativo';
  }
  return 'Assine para liberar todos os recursos';
}

export default function SubscriptionSection({ isDark }: { isDark: boolean }) {
  const { isPremium, isTrialing, trialDaysLeft, status, confirmPurchase, refresh } = useSubscription();

  const handlePress = async () => {
    if (!isPurchasesSupported() || !isNativePurchasesUiAvailable()) return;
    try {
      if (isPremium && !isTrialing) {
        await RevenueCatUI.presentCustomerCenter();
        await refresh();
        return;
      }

      const result = await RevenueCatUI.presentPaywall();
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        const info = await getCustomerInfo();
        if (info) {
          await confirmPurchase(info);
        } else {
          await refresh();
        }
      }
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  const manage = isPremium && !isTrialing;

  return (
    <>
      <SectionTitle isDark={isDark}>Assinatura</SectionTitle>
      <Card isDark={isDark}>
        <SettingsRow
          label={manage ? 'Gerenciar assinatura' : 'Flowly Pro'}
          description={describeStatus({ isPremium, isTrialing, trialDaysLeft, plan: status.plan })}
          isDark={isDark}
          showDivider={false}
          onPress={handlePress}
          trailing={manage ? <ChevronRight size={20} color={isDark ? '#a1a1aa' : '#71717a'} /> : <Crown size={20} color={isDark ? '#facc15' : '#eab308'} />}
        />
      </Card>
    </>
  );
}
