import type { SubscriptionPlanId } from '@/lib/subscription';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription';

/**
 * Linha exigida pela App Store (Guideline 3.1.2) no fluxo de compra:
 * título da assinatura, duração e preço (com equivalente mensal no anual).
 */
export function subscriptionDetailsLine(planId: SubscriptionPlanId, priceLabel: string, perMonthLabel: string): string {
  const title = SUBSCRIPTION_PLANS[planId].title;
  if (planId === 'flowly_yearly') {
    return `Flowly Premium ${title} · 12 meses · ${priceLabel}/ano (${perMonthLabel}/mês)`;
  }
  return `Flowly Premium ${title} · 1 mês · ${priceLabel}/mês`;
}
