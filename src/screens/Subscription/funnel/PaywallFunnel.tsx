/**
 * Funil de ofertas exibido a quem não tem acesso.
 *
 * Encadeia os passos de `OFFER_FUNNEL`: quem recusa uma oferta recebe a
 * seguinte, com desconto maior. Esgotados os passos, o funil avisa o gate para
 * liberar o app em modo limitado. O progresso pode ser controlado pelo pai
 * (`initialStepIndex` / `onStepChange`) para retomar de onde parou.
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
  /** Índice inicial do funil (controlado pelo pai para retomar o passo). */
  initialStepIndex?: number;
  /** Notifica o pai quando o passo muda. */
  onStepChange?: (index: number) => void;
  /** Libera o app em builds de desenvolvimento sem módulo nativo. */
  onDevBypass?: () => void;
};

const FIRST_STEP = OFFER_FUNNEL[0];

export default function PaywallFunnel({ onPurchased, onExhausted, initialStepIndex = 0, onStepChange, onDevBypass }: PaywallFunnelProps) {
  const [stepIndex, setStepIndex] = useState(() => Math.min(Math.max(initialStepIndex, 0), OFFER_FUNNEL_LENGTH - 1));
  const step = getOfferStep(stepIndex) ?? FIRST_STEP;

  // Oferta do passo atual. O "de/por" usa o rótulo comercial do passo 1
  // (`fallbackPriceLabel`), não o priceString da loja — em sandbox/USD a loja
  // devolve valores como `$99.99` e o riscado fica errado para o mercado BR.
  const flow = usePurchaseFlow({
    offeringId: step.offeringId,
    preferredProductId: step.productId,
    fallbackPriceLabel: step.fallbackPriceLabel,
    fallbackAmount: step.fallbackAmount,
    stepId: step.id,
    source: 'gate',
    onDevBypass,
  });

  const basePriceLabel = FIRST_STEP.fallbackPriceLabel;

  useEffect(() => {
    track('paywall_viewed', { step_id: step.id, offering_id: step.offeringId, source: 'gate' });
  }, [step.id, step.offeringId]);

  useEffect(() => {
    onStepChange?.(stepIndex);
  }, [onStepChange, stepIndex]);

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
