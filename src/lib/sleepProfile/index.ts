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

import { useCallback, useEffect, useRef } from 'react';

import { api, getAuthToken } from '@/lib/network';
import { usePendingSync } from '@/lib/pendingSync';
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

/** Endpoint do perfil de sono no servidor (mesmo baseURL da `api`). */
const SYNC_PATH = '/sleep-profile';

/**
 * Guarda de hidratação por sessão do app: garante que o GET inicial só rode uma
 * vez mesmo com vários consumidores montando o hook. Só é marcada como "tentada"
 * quando de fato disparamos a busca (com sessão autenticada), permitindo que uma
 * montagem posterior — já logada — tente de novo.
 */
let hydrationAttempted = false;

function trimOverrides(overrides: Record<string, SleepDayOverride>): Record<string, SleepDayOverride> {
  const keys = Object.keys(overrides).sort();
  if (keys.length <= MAX_OVERRIDES) return overrides;
  const kept = keys.slice(-MAX_OVERRIDES);
  return Object.fromEntries(kept.map((key) => [key, overrides[key]!]));
}

/** Extrai apenas os campos de domínio para enviar ao servidor (sem metadados de storage). */
function toSyncPayload(profile: SleepProfile): SleepProfileData {
  return {
    hasDevice: profile.hasDevice ?? null,
    usualWakeTime: profile.usualWakeTime ?? null,
    usualBedTime: profile.usualBedTime ?? null,
    overrides: profile.overrides ?? {},
  };
}

/** Um perfil "vazio" (nada informado) — usado para decidir se hidratamos do servidor. */
function isProfileEmpty(profile: SleepProfileData): boolean {
  return profile.hasDevice == null && profile.usualWakeTime == null && profile.usualBedTime == null && Object.keys(profile.overrides ?? {}).length === 0;
}

/**
 * Hook do perfil de sono. Compartilhado por chave de storage: onboarding,
 * Tasks e Statistics enxergam o mesmo perfil e reagem às mudanças.
 */
export function useSleepProfile() {
  const [profile, setProfile] = usePersistedState<SleepProfile>(EMPTY_PROFILE, PROFILE_KEY);
  const { enqueue } = usePendingSync();

  const profileRef = useRef(profile);
  profileRef.current = profile;

  /**
   * Envia o perfil completo ao servidor (documento inteiro, escrita idempotente:
   * o último PUT vence). O estado local continua sendo a fonte da UI — o sync é
   * best-effort. Sem sessão autenticada não faz nada; em falha, enfileira para
   * reenvio automático quando a rede/sessão voltar.
   */
  const syncProfile = useCallback(
    (next: SleepProfile) => {
      if (!getAuthToken()) return;
      const payload = toSyncPayload(next);
      api.put(SYNC_PATH, payload).catch(() => {
        enqueue('PUT', SYNC_PATH, payload);
      });
    },
    [enqueue],
  );

  /** Registra se o usuário tem dispositivo que monitora sono. */
  const setHasDevice = useCallback(
    (hasDevice: boolean) => {
      const next = { ...profileRef.current, hasDevice };
      setProfile(next);
      syncProfile(next);
    },
    [setProfile, syncProfile],
  );

  /** Define os horários usuais ("HH:MM"). Passe `null` para limpar um campo. */
  const setUsualTimes = useCallback(
    (times: { wakeTime?: string | null; bedTime?: string | null }) => {
      const { current } = profileRef;
      const next = {
        ...current,
        usualWakeTime: times.wakeTime !== undefined ? times.wakeTime : current.usualWakeTime,
        usualBedTime: times.bedTime !== undefined ? times.bedTime : current.usualBedTime,
      };
      setProfile(next);
      syncProfile(next);
    },
    [setProfile, syncProfile],
  );

  /** Registra a correção manual de uma noite (chave: `YYYY-MM-DD` do dia de acordar). */
  const setDayOverride = useCallback(
    (dayKey: string, override: SleepDayOverride) => {
      const { current } = profileRef;
      const overrides = trimOverrides({ ...(current.overrides ?? {}), [dayKey]: override });
      const next = { ...current, overrides };
      setProfile(next);
      syncProfile(next);
    },
    [setProfile, syncProfile],
  );

  // Hidratação inicial: em sessão autenticada e com o perfil local ainda vazio
  // (reinstalação/novo aparelho), busca o perfil salvo no servidor uma vez e
  // popula o estado local. Não sobrescreve dados locais já informados.
  useEffect(() => {
    if (!profile.loaded) return;
    if (hydrationAttempted) return;
    if (!getAuthToken()) return;
    if (!isProfileEmpty(profileRef.current)) {
      hydrationAttempted = true;
      return;
    }

    hydrationAttempted = true;
    api
      .get<{ profile: SleepProfileData | null }>(SYNC_PATH)
      .then((res) => {
        const remote = res?.profile;
        // Só popula se ainda estiver vazio (o usuário pode ter editado enquanto
        // o GET estava em voo) e o servidor tiver algo de fato.
        if (remote && !isProfileEmpty(remote) && isProfileEmpty(profileRef.current)) {
          setProfile({
            ...profileRef.current,
            hasDevice: remote.hasDevice ?? null,
            usualWakeTime: remote.usualWakeTime ?? null,
            usualBedTime: remote.usualBedTime ?? null,
            overrides: remote.overrides ?? {},
          });
        }
      })
      .catch(() => {
        // Falha de rede: libera para uma nova tentativa em outra montagem.
        hydrationAttempted = false;
      });
  }, [profile.loaded, setProfile]);

  return {
    profile,
    isHydrated: Boolean(profile.loaded),
    setHasDevice,
    setUsualTimes,
    setDayOverride,
  };
}
