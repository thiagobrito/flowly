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

import { useCallback, useEffect, useRef, useState } from 'react';

import { api, getAuthToken } from '@/lib/network';
import { usePendingSync } from '@/lib/pendingSync';
import type { PersistedRecord } from '@/lib/storage';
import { usePersistedState } from '@/lib/storage';

import type { SleepDayOverride, SleepProfileData } from './apply';
import { healUsualTimesFromOverrides, isSleepProfileConfigured, mergeNightTimes } from './apply';

export type { SleepDayOverride, SleepProfileData } from './apply';
export { applySleepProfile, healUsualTimesFromOverrides, isoToTimeString, isSleepProfileConfigured, latestCompleteOverride, mergeNightTimes, minutesToTimeString, timeStringToMinutes } from './apply';

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

/**
 * Hidratação remota (ou decisão de não buscá-la) já concluiu nesta sessão.
 * Compartilhada entre instâncias do hook para o gate da Home não disparar
 * antes do GET /sleep-profile popular o perfil local.
 */
let remoteHydrationSettled = false;
const remoteHydrationListeners = new Set<() => void>();

function markRemoteHydrationSettled(): void {
  if (remoteHydrationSettled) return;
  remoteHydrationSettled = true;
  for (const listener of remoteHydrationListeners) listener();
}

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
  const [remoteSettled, setRemoteSettled] = useState(remoteHydrationSettled);

  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    const onSettle = (): void => setRemoteSettled(true);
    remoteHydrationListeners.add(onSettle);
    if (remoteHydrationSettled) setRemoteSettled(true);
    return () => {
      remoteHydrationListeners.delete(onSettle);
    };
  }, []);

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

  /**
   * Aplica um updater, atualiza o ref na hora (antes do re-render) e sincroniza.
   * Sem o update eager, duas mutações síncronas lêem o mesmo snapshot e a
   * segunda sobrescreve a primeira.
   */
  const commitProfile = useCallback(
    (updater: (current: SleepProfile) => SleepProfile) => {
      const next = updater(profileRef.current);
      profileRef.current = next;
      setProfile(next);
      syncProfile(next);
      return next;
    },
    [setProfile, syncProfile],
  );

  /** Registra se o usuário tem dispositivo que monitora sono. */
  const setHasDevice = useCallback(
    (hasDevice: boolean) => {
      commitProfile((current) => ({ ...current, hasDevice }));
    },
    [commitProfile],
  );

  /** Define os horários usuais ("HH:MM"). Passe `null` para limpar um campo. */
  const setUsualTimes = useCallback(
    (times: { wakeTime?: string | null; bedTime?: string | null }) => {
      commitProfile((current) => ({
        ...current,
        usualWakeTime: times.wakeTime !== undefined ? times.wakeTime : current.usualWakeTime,
        usualBedTime: times.bedTime !== undefined ? times.bedTime : current.usualBedTime,
      }));
    },
    [commitProfile],
  );

  /** Registra a correção manual de uma noite (chave: `YYYY-MM-DD` do dia de acordar). */
  const setDayOverride = useCallback(
    (dayKey: string, override: SleepDayOverride) => {
      commitProfile((current) => ({
        ...current,
        overrides: trimOverrides({ ...(current.overrides ?? {}), [dayKey]: override }),
      }));
    },
    [commitProfile],
  );

  /**
   * Salva horários da noite exibida e, se faltarem usuais, preenche ambos na
   * mesma escrita (evita corrida setUsualTimes + setDayOverride).
   */
  const saveNightTimes = useCallback(
    (dayKey: string, times: { wakeTime: string; bedTime: string }) => {
      commitProfile((current) => mergeNightTimes(current, dayKey, times, trimOverrides));
    },
    [commitProfile],
  );

  // Hidratação inicial: em sessão autenticada e com o perfil local ainda vazio
  // (reinstalação/novo aparelho), busca o perfil salvo no servidor uma vez e
  // popula o estado local. Não sobrescreve dados locais já informados.
  useEffect(() => {
    if (!profile.loaded) return;
    if (remoteHydrationSettled) return;
    if (hydrationAttempted) return;

    // Sem sessão: o gate da Home só roda autenticado; aqui liberamos isReady
    // com o que já veio do AsyncStorage.
    if (!getAuthToken()) {
      // Cura perfil local corrompido (override sem usuais) antes de liberar o gate.
      const healed = healUsualTimesFromOverrides(profileRef.current);
      if (healed !== profileRef.current) {
        profileRef.current = healed;
        setProfile(healed);
      }
      markRemoteHydrationSettled();
      return;
    }

    // Perfil local já preenchido: ele pode nunca ter chegado ao servidor (o PUT
    // best-effort falhou e a fila de reenvio se perdeu, reinstalação/novo
    // aparelho, ou dado anterior à existência do sync). Reconciliamos no sentido
    // local → servidor uma vez por sessão (PUT idempotente) — sem isso o MCP e
    // as estatísticas ficam sem o perfil mesmo com o app mostrando os horários.
    if (!isProfileEmpty(profileRef.current)) {
      hydrationAttempted = true;
      const healed = healUsualTimesFromOverrides(profileRef.current);
      if (healed !== profileRef.current) {
        profileRef.current = healed;
        setProfile(healed);
        syncProfile(healed);
      } else {
        syncProfile(profileRef.current);
      }
      markRemoteHydrationSettled();
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
          const healed = healUsualTimesFromOverrides({
            ...profileRef.current,
            hasDevice: remote.hasDevice ?? null,
            usualWakeTime: remote.usualWakeTime ?? null,
            usualBedTime: remote.usualBedTime ?? null,
            overrides: remote.overrides ?? {},
          });
          profileRef.current = healed;
          setProfile(healed);
          // Se o heal preencheu usuais que faltavam no remoto, persiste de volta.
          if (healed.usualWakeTime !== remote.usualWakeTime || healed.usualBedTime !== remote.usualBedTime) {
            syncProfile(healed);
          }
        }
      })
      .catch(() => {
        // Falha de rede: libera para uma nova tentativa em outra montagem.
        hydrationAttempted = false;
      })
      .finally(() => {
        markRemoteHydrationSettled();
      });
  }, [profile.loaded, setProfile, syncProfile]);

  return {
    profile,
    isHydrated: Boolean(profile.loaded),
    /** Local hidratado e tentativa de sync remoto (GET) já concluída nesta sessão. */
    isReady: Boolean(profile.loaded) && remoteSettled,
    isConfigured: isSleepProfileConfigured(profile),
    setHasDevice,
    setUsualTimes,
    setDayOverride,
    saveNightTimes,
  };
}
