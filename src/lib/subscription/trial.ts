/**
 * Trial local (client-side).
 *
 * Controla o período de teste gratuito no dispositivo: a duração vem de uma
 * feature flag (`useFeatureFlags().trialDays` — 7, 14 ou 21 dias) e o início é
 * registrado em storage na primeira vez que o usuário entra na Home após o
 * onboarding. O backend/RevenueCat continuam sendo a autoridade sobre a
 * assinatura paga; este trial só concede acesso temporário enquanto o usuário
 * ainda não assinou — a compra pode acontecer a qualquer momento (dia 0
 * inclusive) e simplesmente passa por cima do trial.
 */

import { useCallback } from 'react';

import type { PersistedRecord } from '@/lib/storage';
import { usePersistedState } from '@/lib/storage';

type LocalTrialState = PersistedRecord & {
  /** ISO da primeira entrada na Home; `null` enquanto o trial não começou. */
  startedAt: string | null;
  loaded?: boolean;
  lastUpdate?: string;
};

const TRIAL_KEY = 'local_trial_v1';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const EMPTY_TRIAL: LocalTrialState = { startedAt: null };

/**
 * Hook do trial local. `trialDays` vem da feature flag; mudanças na flag
 * alteram a janela imediatamente (o início registrado não muda).
 */
export function useLocalTrial(trialDays: number) {
  const [state, setState] = usePersistedState<LocalTrialState>(EMPTY_TRIAL, TRIAL_KEY);

  const isHydrated = Boolean(state.loaded);
  const startedAtMs = state.startedAt ? new Date(state.startedAt).getTime() : NaN;
  const trialEndsAtMs = Number.isNaN(startedAtMs) ? null : startedAtMs + trialDays * MS_PER_DAY;
  const daysLeft = trialEndsAtMs === null ? 0 : Math.max(0, Math.ceil((trialEndsAtMs - Date.now()) / MS_PER_DAY));

  /** Registra o início do trial uma única vez (idempotente; espera a hidratação). */
  const startIfNeeded = useCallback(() => {
    if (!state.loaded || state.startedAt) return;
    setState({ startedAt: new Date().toISOString() });
  }, [state.loaded, state.startedAt, setState]);

  return {
    isHydrated,
    /** `true` enquanto o trial não começou (nenhuma entrada registrada). */
    notStarted: isHydrated && !state.startedAt,
    /** `true` se o trial começou e ainda não expirou. */
    isActive: Boolean(state.startedAt) && daysLeft > 0,
    /** `true` se o trial começou e a janela terminou. */
    isExpired: Boolean(state.startedAt) && daysLeft === 0,
    daysLeft,
    startIfNeeded,
  };
}
