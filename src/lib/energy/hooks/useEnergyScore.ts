import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { applySleepProfile, useSleepProfile } from '@/lib/sleepProfile';

import { getHealthProvider } from '../collectors';
import type { EnergyConfig } from '../config';
import { defaultConfig } from '../config';
import { computeEnergyScore } from '../engine';
import type { DateRange, EnergyScore, HealthMetrics } from '../types';

export interface UseEnergyScoreOptions {
  /** Engine configuration (weights / ranges). Defaults to {@link defaultConfig}. */
  config?: EnergyConfig;
  /** Collection window. Defaults to the last 14 days (sleep-debt window). */
  range?: DateRange;
  /** Request permissions and fetch automatically on mount. Defaults to true. */
  autoFetch?: boolean;
}

export interface UseEnergyScoreResult {
  /** Final 0-100 score, or `null` before the first successful computation. */
  score: number | null;
  /** Full energy result including the per-metric breakdown. */
  energy: EnergyScore | null;
  /** Raw normalized metrics that produced the score. */
  metrics: HealthMetrics | null;
  loading: boolean;
  error: Error | null;
  hasPermissions: boolean;
  /** Request health read permissions; resolves to whether they were granted. */
  requestPermissions: () => Promise<boolean>;
  /** Re-collect data and recompute the score. */
  refresh: () => Promise<void>;
}

/**
 * React hook that wires the full pipeline:
 * permissions -> Coletor de Dados -> Energy Engine -> Energy Score.
 */
export const useEnergyScore = (options: UseEnergyScoreOptions = {}): UseEnergyScoreResult => {
  const { config = defaultConfig, range, autoFetch = true } = options;

  const provider = useMemo(() => getHealthProvider(), []);
  const mounted = useRef(true);

  // Perfil de sono informado pelo usuário: preenche horários de acordar/dormir
  // quando a saúde não os traz (sem wearable) e aplica correções manuais.
  // Ref mantém `refresh` estável (evita re-pedir permissões a cada mudança).
  const { profile } = useSleepProfile();
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const lastCollectedRef = useRef<HealthMetrics | null>(null);

  const [energy, setEnergy] = useState<EnergyScore | null>(null);
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasPermissions, setHasPermissions] = useState(false);

  const requestPermissions = useCallback(async () => {
    try {
      const granted = await provider.requestPermissions();
      if (mounted.current) setHasPermissions(granted);
      return granted;
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
      return false;
    }
  }, [provider]);

  const refresh = useCallback(async () => {
    if (mounted.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const collected = await provider.collect(range);
      lastCollectedRef.current = collected;
      // O dia de referência do perfil é o dia visualizado (fim do range), não
      // necessariamente hoje — importa para overrides de dias anteriores.
      const augmented = applySleepProfile(collected, profileRef.current, range?.endDate);
      const computed = computeEnergyScore(augmented, config);
      if (mounted.current) {
        setMetrics(augmented);
        setEnergy(computed);
      }
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [provider, range, config]);

  // Reaplica o perfil sobre a última coleta quando ele muda (ex.: horário
  // editado no SleepCard ou definido no onboarding) — sem nova coleta nem
  // novo pedido de permissão.
  useEffect(() => {
    const collected = lastCollectedRef.current;
    if (!collected) return;
    const augmented = applySleepProfile(collected, profile, range?.endDate);
    setMetrics(augmented);
    setEnergy(computeEnergyScore(augmented, config));
  }, [profile, range, config]);

  useEffect(() => {
    mounted.current = true;
    if (autoFetch) {
      const run = async () => {
        await requestPermissions();
        await refresh();
      };
      run().catch(() => undefined);
    }
    return () => {
      mounted.current = false;
    };
  }, [autoFetch, requestPermissions, refresh]);

  return {
    score: energy?.score ?? null,
    energy,
    metrics,
    loading,
    error,
    hasPermissions,
    requestPermissions,
    refresh,
  };
};
