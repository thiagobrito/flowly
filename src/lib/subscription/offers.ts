/**
 * Funil de ofertas do paywall.
 *
 * Descreve, de forma declarativa, os passos exibidos a quem não tem acesso:
 * preço cheio → desconto intermediário → oferta final. Cada passo aponta para
 * um Offering distinto no RevenueCat; os preços reais sempre vêm da loja, os
 * rótulos aqui são só apresentação.
 *
 * Os identificadores de Offering são parametrizáveis por env para permitir
 * testar variações sem novo build de código (as vars `EXPO_PUBLIC_*` são
 * inlinadas pelo Expo, por isso a leitura precisa ser literal).
 */

import type { SubscriptionPlanId } from './plans';

export type OfferStepId = 'default' | 'downsell' | 'last_chance';

export type OfferStep = {
  id: OfferStepId;
  /** Offering no RevenueCat de onde saem os packages deste passo. */
  offeringId: string;
  layout: 'full' | 'sheet';
  /** Plano destacado. Os passos de desconto só vendem o anual. */
  plan: SubscriptionPlanId;
  title: string;
  subtitle: string;
  /** Selo exibido acima do preço (ex.: "MAIS POPULAR"). */
  badge?: string;
  /** Rótulo do desconto (ex.: "20% OFF"). Ausente no passo de preço cheio. */
  discountLabel?: string;
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
    layout: 'full',
    plan: 'flowly_yearly',
    title: 'Desbloqueie o Flowly Premium',
    subtitle: 'Metas, calendário, estatísticas e assistente de voz sem limites.',
    badge: 'MAIS POPULAR',
    showPlanToggle: true,
    ctaLabel: 'Assinar agora',
    dismissLabel: 'Agora não',
  },
  {
    id: 'downsell',
    offeringId: OFFERING_DOWNSELL,
    layout: 'sheet',
    plan: 'flowly_yearly',
    title: 'Só hoje no plano anual',
    subtitle: 'Um desconto para você começar sem pesar no bolso.',
    discountLabel: '20% OFF',
    countdownSeconds: 10 * MINUTE,
    showPlanToggle: false,
    ctaLabel: 'Quero o desconto',
    dismissLabel: 'Não, obrigado',
  },
  {
    id: 'last_chance',
    offeringId: OFFERING_LAST_CHANCE,
    layout: 'full',
    plan: 'flowly_yearly',
    title: 'Nossa melhor oferta',
    subtitle: 'Sua última chance de garantir o plano anual pelo menor preço disponível.',
    discountLabel: 'MENOR PREÇO',
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
