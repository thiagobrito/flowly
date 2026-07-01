/**
 * # Feature flags
 *
 * Flags remotas com fallback local, seguindo o padrão lib-fina + hook do
 * projeto (como `onboarding/`). O valor persistido em storage é a fonte de
 * verdade imediata (sem flicker); `GET /feature-flags` atualiza em background
 * e o app usa o novo valor a partir da hidratação seguinte.
 *
 * Flags disponíveis:
 * - `trialDays` — duração do período de teste gratuito (7, 14 ou 21 dias).
 */

import { useEffect, useRef } from 'react';

import { api } from '@/lib/network';
import type { PersistedRecord } from '@/lib/storage';
import { usePersistedState } from '@/lib/storage';

/** Durações de trial suportadas pelo produto. */
export type TrialDays = 7 | 14 | 21;

export type FeatureFlags = PersistedRecord & {
  trialDays: TrialDays;
  loaded?: boolean;
  lastUpdate?: string;
};

const FLAGS_KEY = 'feature_flags_v1';

export const DEFAULT_TRIAL_DAYS: TrialDays = 7;

const DEFAULT_FLAGS: FeatureFlags = { trialDays: DEFAULT_TRIAL_DAYS };

function isTrialDays(value: unknown): value is TrialDays {
  return value === 7 || value === 14 || value === 21;
}

/**
 * Hook de feature flags. Compartilhado por chave de storage — qualquer tela
 * que o use enxerga o mesmo valor. Busca a versão remota uma vez por mount.
 */
export function useFeatureFlags() {
  const [flags, setFlags] = usePersistedState<FeatureFlags>(DEFAULT_FLAGS, FLAGS_KEY);

  const flagsRef = useRef(flags);
  flagsRef.current = flags;

  useEffect(() => {
    let active = true;

    async function fetchFlags() {
      try {
        const remote = await api.get<Partial<FeatureFlags>>('/feature-flags');
        if (!active || !remote || !isTrialDays(remote.trialDays)) return;
        if (remote.trialDays !== flagsRef.current.trialDays) {
          setFlags({ trialDays: remote.trialDays });
        }
      } catch {
        // mantém as flags locais quando o backend não responde
      }
    }

    fetchFlags();
    return () => {
      active = false;
    };
  }, [setFlags]);

  return {
    isHydrated: Boolean(flags.loaded),
    /** Duração do trial vigente (validada; cai no default se corrompida). */
    trialDays: isTrialDays(flags.trialDays) ? flags.trialDays : DEFAULT_TRIAL_DAYS,
  };
}
