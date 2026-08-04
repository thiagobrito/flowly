/**
 * Funil de ofertas do paywall.
 *
 * Preços comerciais (anual):
 * - default:      R$ 199,90  → productId `flowly_yearly`
 * - downsell:     R$ 159,92  (−20%) → productId `flowly_yearly_20`
 * - last_chance:  R$ 79,96   (−60%) → productId `flowly_yearly_60`
 *
 * Cada passo aponta para um Offering no RevenueCat (`default`, `downsell`,
 * `last_chance`). O preço cobrado e exibido vem da App Store / Play via o
 * package do Offering; os rótulos abaixo são só apresentação e fallback.
 * Guia de setup: `mobile/docs/revenuecat-offerings-funnel.md`.
 *
 * Identificadores de Offering parametrizáveis por env (`EXPO_PUBLIC_*`).
 */

import type { SubscriptionPlanId } from './plans';

export type OfferStepId = 'default' | 'downsell' | 'last_chance';

export type OfferStep = {
  id: OfferStepId;
  /** Offering no RevenueCat de onde saem os packages deste passo. */
  offeringId: string;
  /**
   * Product ID na App Store / Play deste passo. Precisa conter `year`/`annual`/
   * `anual` para `resolvePlanId` e para o backend aceitar o pagamento.
   */
  productId: string;
  layout: 'full' | 'sheet';
  /** Plano destacado. Os passos de desconto só vendem o anual. */
  plan: SubscriptionPlanId;
  title: string;
  subtitle: string;
  /** Selo exibido acima do preço (ex.: "MAIS POPULAR"). */
  badge?: string;
  /** Rótulo do desconto (ex.: "20% OFF"). Ausente no passo de preço cheio. */
  discountLabel?: string;
  /** Fallback de preço quando a loja ainda não devolveu o package. */
  fallbackPriceLabel: string;
  /** Valor numérico do passo (para equivalente mensal sem package da loja). */
  fallbackAmount: number;
  /** Duração da contagem regressiva. Ausente = sem urgência no passo. */
  countdownSeconds?: number;
  /** Só o primeiro passo deixa escolher entre anual e mensal. */
  showPlanToggle: boolean;
  ctaLabel: string;
  /** Texto do link que recusa a oferta e avança o funil. */
  dismissLabel: string;
};

const OFFERING_DEFAULT = process.env.EXPO_PUBLIC_RC_OFFERING_DEFAULT || 'default';
const OFFERING_DOWNSELL = process.env.EXPO_PUBLIC_RC_OFFERING_DOWNSELL || 'downsell';
const OFFERING_LAST_CHANCE = process.env.EXPO_PUBLIC_RC_OFFERING_LAST_CHANCE || 'last_chance';

const MINUTE = 60;

/** Tupla não-vazia: o primeiro passo sempre existe (preço cheio). */
export const OFFER_FUNNEL: [OfferStep, ...OfferStep[]] = [
  {
    id: 'default',
    offeringId: OFFERING_DEFAULT,
    productId: 'flowly_yearly',
    layout: 'full',
    plan: 'flowly_yearly',
    title: 'Desbloqueie o Flowly Premium',
    subtitle: 'Metas, calendário, estatísticas e assistente de voz sem limites.',
    badge: 'MAIS POPULAR',
    fallbackPriceLabel: 'R$ 199,90',
    fallbackAmount: 199.9,
    showPlanToggle: true,
    ctaLabel: 'Assinar agora',
    dismissLabel: 'Agora não',
  },
  {
    id: 'downsell',
    offeringId: OFFERING_DOWNSELL,
    productId: 'flowly_yearly_20',
    layout: 'sheet',
    plan: 'flowly_yearly',
    title: 'Só hoje no plano anual',
    subtitle: 'Um desconto para você começar sem pesar no bolso.',
    discountLabel: '20% OFF',
    fallbackPriceLabel: 'R$ 159,92',
    fallbackAmount: 159.92,
    countdownSeconds: 10 * MINUTE,
    showPlanToggle: false,
    ctaLabel: 'Quero o desconto',
    dismissLabel: 'Não, obrigado',
  },
  {
    id: 'last_chance',
    offeringId: OFFERING_LAST_CHANCE,
    productId: 'flowly_yearly_60',
    layout: 'full',
    plan: 'flowly_yearly',
    title: 'Nossa melhor oferta',
    subtitle: 'Sua última chance de garantir o plano anual pelo menor preço disponível.',
    discountLabel: '60% OFF',
    fallbackPriceLabel: 'R$ 79,96',
    fallbackAmount: 79.96,
    countdownSeconds: 2 * MINUTE,
    showPlanToggle: false,
    ctaLabel: 'Garantir oferta',
    dismissLabel: 'Recusar oferta',
  },
];

/** Passo do funil por índice, ou `null` quando o funil acabou. */
export function getOfferStep(index: number): OfferStep | null {
  return OFFER_FUNNEL[index] ?? null;
}

export const OFFER_FUNNEL_LENGTH = OFFER_FUNNEL.length;
