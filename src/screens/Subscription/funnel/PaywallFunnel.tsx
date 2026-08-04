/**
 * Funil de ofertas exibido a quem não tem acesso.
 *
 * Encadeia os passos de `OFFER_FUNNEL`: quem recusa uma oferta recebe a
 * seguinte, com desconto maior. Esgotados os passos, o funil avisa o gate para
 * mostrar o bloqueio. O progresso vive só em memória — reabrir o app recomeça
 * do preço cheio.
 */

import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import type { SubscriptionPlanId } from '@/lib/subscription';
import { getOfferStep, OFFER_FUNNEL, OFFER_FUNNEL_LENGTH } from '@/lib/subscription';
import { track } from '@/lib/telemetry';

import { usePurchaseFlow } from '../usePurchaseFlow';
import DownsellSheet from './DownsellSheet';
import FullOffer from './FullOffer';

type PaywallFunnelProps = {
  /** Compra concluída (ou restaurada): o gate deve reavaliar o acesso. */
  onPurchased: () => void;
  /** Todas as ofertas foram recusadas. */
  onExhausted: () => void;
  /** Libera o app em builds de desenvolvimento sem módulo nativo. */
  onDevBypass?: () => void;
};

const FIRST_STEP = OFFER_FUNNEL[0];

export default function PaywallFunnel({ onPurchased, onExhausted, onDevBypass }: PaywallFunnelProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = getOfferStep(stepIndex) ?? FIRST_STEP;

  // Duas leituras do RevenueCat: a oferta do passo atual e a de preço cheio,
  // que serve de referência para o "de/por". O SDK cacheia os offerings, então
  // não há chamada extra à loja.
  const baseFlow = usePurchaseFlow({ offeringId: FIRST_STEP.offeringId });
  const flow = usePurchaseFlow({ offeringId: step.offeringId, stepId: step.id, source: 'gate', onDevBypass });

  const basePriceLabel = baseFlow.findPackage('flowly_yearly') ? baseFlow.priceLabelFor('flowly_yearly') : null;

  useEffect(() => {
    track('paywall_viewed', { step_id: step.id, offering_id: step.offeringId, source: 'gate' });
  }, [step.id, step.offeringId]);

  const advance = useCallback(() => {
    track('paywall_dismissed', { step_id: step.id });

    if (stepIndex + 1 >= OFFER_FUNNEL_LENGTH) {
      track('funnel_exhausted');
      onExhausted();
      return;
    }
    setStepIndex(stepIndex + 1);
  }, [onExhausted, step.id, stepIndex]);

  const handleSubscribe = useCallback(
    async (plan: SubscriptionPlanId) => {
      const outcome = await flow.purchase(plan);
      if (outcome.status === 'success') onPurchased();
    },
    [flow, onPurchased],
  );

  const handleRestore = useCallback(async () => {
    const outcome = await flow.restore();
    if (outcome.status === 'success') onPurchased();
  }, [flow, onPurchased]);

  if (step.layout === 'sheet') {
    return (
      <View className="flex-1">
        <DownsellSheet step={step} flow={flow} basePriceLabel={basePriceLabel} onSubscribe={handleSubscribe} onDismiss={advance} />
      </View>
    );
  }

  return <FullOffer step={step} flow={flow} basePriceLabel={basePriceLabel} onSubscribe={handleSubscribe} onDismiss={advance} onRestore={handleRestore} />;
}
