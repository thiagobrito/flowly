/**
 * # Onboarding state
 *
 * Estado persistido que controla se o fluxo de onboarding deve ser exibido.
 * Segue o padrão lib-fina + hook do projeto (como `auth/`), usando
 * `usePersistedState` para espelhar a flag entre todas as telas.
 *
 * Regra de disparo: o onboarding é exibido **apenas para novos cadastros**.
 * Por isso o default é `completed: true` — usuários que já estavam logados
 * (sem flag salva) e logins de contas existentes pulam o fluxo. O cadastro
 * (`signUp`) chama `markNeedsOnboarding()` para forçar a exibição.
 */

import { useCallback } from 'react';

import type { PersistedRecord } from '@/lib/storage';
import { usePersistedState } from '@/lib/storage';

/** Idiomas suportados pela UI (apenas PT-BR selecionável por enquanto). */
export type OnboardingLanguage = 'pt-BR' | 'en-US';

export type OnboardingState = PersistedRecord & {
  /** `false` quando o usuário ainda precisa passar pelo onboarding. */
  completed: boolean;
  /** Idioma escolhido durante o onboarding. */
  language: OnboardingLanguage;
  /** Marcado como `true` pela lib de storage após a hidratação. */
  loaded?: boolean;
  lastUpdate?: string;
};

const ONBOARDING_KEY = 'onboarding_v2';

const DEFAULT_STATE: OnboardingState = {
  completed: true,
  language: 'pt-BR',
};

/**
 * Hook de onboarding. Compartilhado por chave de storage, então qualquer
 * mudança reflete em todas as telas que o utilizam.
 */
export function useOnboarding() {
  const [state, setState] = usePersistedState<OnboardingState>(DEFAULT_STATE, ONBOARDING_KEY);

  const markNeedsOnboarding = useCallback(() => {
    setState({ completed: false, language: state.language });
  }, [setState, state.language]);

  const markCompleted = useCallback(() => {
    setState({ completed: true, language: state.language });
  }, [setState, state.language]);

  const setLanguage = useCallback(
    (language: OnboardingLanguage) => {
      setState({ completed: state.completed, language });
    },
    [setState, state.completed],
  );

  return {
    isHydrated: Boolean(state.loaded),
    completed: state.completed,
    language: state.language,
    markNeedsOnboarding,
    markCompleted,
    setLanguage,
  };
}
