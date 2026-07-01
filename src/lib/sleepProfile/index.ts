/**
 * # Sleep profile
 *
 * Perfil de sono informado pelo usuário — horário usual de acordar/dormir e
 * correções manuais por dia. É o fallback que mantém o Energy Score funcional
 * para quem não tem Apple Watch/wearable (ou não concedeu acesso à saúde):
 * `applySleepProfile` preenche `wakeTime`/`bedTime`/`sleepHours` nas métricas
 * quando os dados de saúde não os trazem, e o override diário permite corrigir
 * a noite exibida no SleepCard.
 *
 * Segue o padrão lib-fina + hook do projeto (`featureFlags/`, `pendingSync/`).
 */

import { useCallback, useRef } from 'react';

import type { PersistedRecord } from '@/lib/storage';
import { usePersistedState } from '@/lib/storage';

import type { SleepDayOverride, SleepProfileData } from './apply';

export type { SleepDayOverride, SleepProfileData } from './apply';
export { applySleepProfile, minutesToTimeString, timeStringToMinutes } from './apply';

export type SleepProfile = PersistedRecord &
  SleepProfileData & {
    loaded?: boolean;
    lastUpdate?: string;
  };

const PROFILE_KEY = 'sleep_profile_v1';

/** Mantém só os overrides mais recentes para o payload não crescer sem limite. */
const MAX_OVERRIDES = 30;

export const DEFAULT_WAKE_TIME = '07:00';
export const DEFAULT_BED_TIME = '23:00';

const EMPTY_PROFILE: SleepProfile = { hasDevice: null, usualWakeTime: null, usualBedTime: null, overrides: {} };

function trimOverrides(overrides: Record<string, SleepDayOverride>): Record<string, SleepDayOverride> {
  const keys = Object.keys(overrides).sort();
  if (keys.length <= MAX_OVERRIDES) return overrides;
  const kept = keys.slice(-MAX_OVERRIDES);
  return Object.fromEntries(kept.map((key) => [key, overrides[key]!]));
}

/**
 * Hook do perfil de sono. Compartilhado por chave de storage: onboarding,
 * Tasks e Statistics enxergam o mesmo perfil e reagem às mudanças.
 */
export function useSleepProfile() {
  const [profile, setProfile] = usePersistedState<SleepProfile>(EMPTY_PROFILE, PROFILE_KEY);

  const profileRef = useRef(profile);
  profileRef.current = profile;

  /** Registra se o usuário tem dispositivo que monitora sono. */
  const setHasDevice = useCallback(
    (hasDevice: boolean) => {
      setProfile({ ...profileRef.current, hasDevice });
    },
    [setProfile],
  );

  /** Define os horários usuais ("HH:MM"). Passe `null` para limpar um campo. */
  const setUsualTimes = useCallback(
    (times: { wakeTime?: string | null; bedTime?: string | null }) => {
      const { current } = profileRef;
      setProfile({
        ...current,
        usualWakeTime: times.wakeTime !== undefined ? times.wakeTime : current.usualWakeTime,
        usualBedTime: times.bedTime !== undefined ? times.bedTime : current.usualBedTime,
      });
    },
    [setProfile],
  );

  /** Registra a correção manual de uma noite (chave: `YYYY-MM-DD` do dia de acordar). */
  const setDayOverride = useCallback(
    (dayKey: string, override: SleepDayOverride) => {
      const { current } = profileRef;
      const overrides = trimOverrides({ ...(current.overrides ?? {}), [dayKey]: override });
      setProfile({ ...current, overrides });
    },
    [setProfile],
  );

  return {
    profile,
    isHydrated: Boolean(profile.loaded),
    setHasDevice,
    setUsualTimes,
    setDayOverride,
  };
}
