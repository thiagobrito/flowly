/**
 * Tipos de planos comercializados (sem dependências — seguro importar em config).
 */

export type SubscriptionPlanId = 'flowly_montly' | 'flowly_yearly';

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  productId: string;
  priceLabel: string;
  amount: number;
  period: 'month' | 'year';
  title: string;
};
