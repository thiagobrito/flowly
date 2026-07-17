/**
 * Lógica pura do perfil de sono: sintetiza horários de acordar/dormir a partir
 * do que o usuário informou, preenchendo as lacunas das métricas de saúde.
 *
 * Precedência por campo:
 * 1. Override manual do dia (editado no SleepCard) — vence inclusive dos dados
 *    de saúde, pois é uma correção explícita do usuário.
 * 2. Dados de saúde coletados (Apple Health / Health Connect).
 * 3. Horários usuais do perfil (informados no onboarding).
 */

import { localDateKey, startOfLocalDay, toLocalISOString } from '@/lib/date';
import type { HealthMetrics } from '@/lib/energy/types';

/** Horários "HH:MM" informados manualmente para um dia específico (dia de acordar). */
export type SleepDayOverride = {
  wakeTime?: string | null;
  bedTime?: string | null;
};

/** Perfil de sono persistido (ver `useSleepProfile`). */
export type SleepProfileData = {
  hasDevice?: boolean | null;
  usualWakeTime?: string | null;
  usualBedTime?: string | null;
  overrides?: Record<string, SleepDayOverride> | null;
};

const HHMM_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Converte "HH:MM" em minutos desde a meia-noite, ou `null` se inválido. */
export function timeStringToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = HHMM_RE.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Formata minutos desde a meia-noite como "HH:MM" (wrap em 24h). */
export function minutesToTimeString(minutes: number): string {
  const wrapped = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Extrai "HH:MM" (hora local do aparelho) de um ISO, ou `null` se inválido. */
export function isoToTimeString(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return minutesToTimeString(date.getHours() * 60 + date.getMinutes());
}

/**
 * Perfil pronto para o app não pedir horários de novo: dispositivo de sono
 * já configurado (Health) ou ambos os horários usuais preenchidos.
 */
export function isSleepProfileConfigured(profile: SleepProfileData | null | undefined): boolean {
  if (!profile) return false;
  if (profile.hasDevice === true) return true;
  const wake = profile.usualWakeTime?.trim();
  const bed = profile.usualBedTime?.trim();
  return Boolean(wake && bed);
}

/** Override mais recente (chave `YYYY-MM-DD`) com ambos os horários preenchidos. */
export function latestCompleteOverride(overrides: Record<string, SleepDayOverride> | null | undefined): SleepDayOverride | null {
  if (!overrides) return null;
  const keys = Object.keys(overrides).sort();
  for (let i = keys.length - 1; i >= 0; i -= 1) {
    const entry = overrides[keys[i]!];
    const wake = entry?.wakeTime?.trim();
    const bed = entry?.bedTime?.trim();
    if (wake && bed) return { wakeTime: wake, bedTime: bed };
  }
  return null;
}

/**
 * Recupera usuais perdidos (ex.: corrida ao salvar override) a partir do
 * override diário mais recente com ambos os horários. Retorna o mesmo objeto
 * se não houver o que curar.
 */
export function healUsualTimesFromOverrides<T extends SleepProfileData>(profile: T): T {
  const wake = profile.usualWakeTime?.trim();
  const bed = profile.usualBedTime?.trim();
  if (wake && bed) return profile;

  const recovered = latestCompleteOverride(profile.overrides);
  if (!recovered) return profile;

  return {
    ...profile,
    usualWakeTime: wake || recovered.wakeTime || null,
    usualBedTime: bed || recovered.bedTime || null,
  };
}

/**
 * Mescla override do dia e, se faltarem usuais, preenche ambos numa só escrita
 * — evita a corrida de `setUsualTimes` + `setDayOverride` síncronos.
 */
export function mergeNightTimes<T extends SleepProfileData>(profile: T, dayKey: string, times: { wakeTime: string; bedTime: string }, trimOverrides: (overrides: Record<string, SleepDayOverride>) => Record<string, SleepDayOverride>): T {
  const overrides = trimOverrides({ ...(profile.overrides ?? {}), [dayKey]: times });
  const needsUsual = !profile.usualWakeTime?.trim() || !profile.usualBedTime?.trim();
  return {
    ...profile,
    overrides,
    ...(needsUsual ? { usualWakeTime: times.wakeTime, usualBedTime: times.bedTime } : {}),
  };
}

/** ISO (fuso do app) do dia civil de `dayRefIso` no horário `hhmm`, com deslocamento opcional de dias. */
function isoAtTime(dayRefIso: string, hhmm: string, dayOffset = 0): string | null {
  const minutes = timeStringToMinutes(hhmm);
  if (minutes === null) return null;
  const base = startOfLocalDay(dayRefIso);
  return toLocalISOString(new Date(base.getTime() + dayOffset * DAY_MS + minutes * 60_000));
}

/**
 * Aplica o perfil de sono às métricas coletadas, preenchendo `wakeTime`,
 * `bedTime` e `sleepHours` quando faltarem (ou quando houver override manual
 * para o dia). Campos fisiológicos (HRV, FC etc.) nunca são alterados.
 *
 * @param referenceIso Dia de referência (dia do despertar). Default: `metrics.now`.
 */
export function applySleepProfile(metrics: HealthMetrics, profile: SleepProfileData | null | undefined, referenceIso?: string): HealthMetrics {
  if (!profile) return metrics;

  const ref = referenceIso ?? metrics.now;
  const dayKey = localDateKey(new Date(ref));
  const override = profile.overrides?.[dayKey] ?? null;

  // Fonte manual por campo: override sempre; horário usual apenas quando os
  // dados de saúde não trouxeram o campo.
  const wakeSource = override?.wakeTime ?? (metrics.wakeTime ? null : (profile.usualWakeTime ?? null));
  const bedSource = override?.bedTime ?? (metrics.bedTime ? null : (profile.usualBedTime ?? null));
  if (!wakeSource && !bedSource) return metrics;

  let { wakeTime, bedTime, sleepHours } = metrics;

  if (wakeSource) {
    wakeTime = isoAtTime(ref, wakeSource) ?? wakeTime;
  }

  if (bedSource) {
    const bedSameDay = isoAtTime(ref, bedSource);
    if (bedSameDay) {
      // O horário de dormir pertence à noite anterior quando é igual/posterior
      // ao despertar no mesmo dia (ex.: dormiu 23:00, acordou 07:00).
      const wakeAnchor = wakeTime ?? isoAtTime(ref, '12:00');
      const belongsToPreviousDay = wakeAnchor !== null && new Date(bedSameDay).getTime() >= new Date(wakeAnchor).getTime();
      bedTime = belongsToPreviousDay ? isoAtTime(ref, bedSource, -1) : bedSameDay;
    }
  }

  // Recalcula a duração quando algum horário veio de fonte manual e o intervalo
  // é plausível (evita corromper `sleepHours` com entradas inconsistentes).
  if (wakeTime && bedTime) {
    const span = (new Date(wakeTime).getTime() - new Date(bedTime).getTime()) / HOUR_MS;
    if (span > 0 && span <= 18) {
      sleepHours = Math.round(span * 100) / 100;
    }
  }

  return { ...metrics, wakeTime, bedTime, sleepHours };
}
