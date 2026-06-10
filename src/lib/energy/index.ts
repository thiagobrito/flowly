/**
 * # Energy Score library (inspirado em SAFTE)
 *
 * Calcula um score de energia (0–100) a partir de dados de saúde coletados do
 * Apple Health (iOS) ou Health Connect (Android).
 *
 * ## Arquitetura
 *
 * ```
 * Apple Health / Health Connect
 *           │
 *           ▼
 *    Coletor de Dados      (collectors)
 *           │
 *           ▼
 *     Energy Engine        (engine)
 *           │
 *           ▼
 *      Energy Score        (0-100)
 * ```
 *
 * ## Pré-requisitos
 *
 * - **Dev build** (não funciona no Expo Go).
 * - iOS: HealthKit habilitado no bundle identifier (Apple Developer).
 * - Android: Health Connect instalado (minSdk 26+).
 * - Permissões já configuradas em `app.json` via config plugins.
 *
 * ## Uso rápido (React)
 *
 * ```tsx
 * import { useEnergyScore } from '@/lib/energy';
 *
 * function EnergyCard() {
 *   const { score, energy, loading, error, refresh } = useEnergyScore();
 *
 *   if (loading) return <Text>Calculando...</Text>;
 *   if (error) return <Text>Erro: {error.message}</Text>;
 *
 *   return (
 *     <>
 *       <Text>Energy Score: {score ?? '--'}</Text>
 *       <Text>Faixa: {energy?.band}</Text>
 *       <Button title="Atualizar" onPress={refresh} />
 *     </>
 *   );
 * }
 * ```
 *
 * ### Opções do hook
 *
 * ```tsx
 * useEnergyScore({
 *   autoFetch: true,           // pede permissão e coleta no mount (padrão)
 *   range: lastDaysRange(14),  // janela de coleta (padrão: 14 dias)
 *   config: defaultConfig,     // pesos e faixas de normalização
 * });
 * ```
 *
 * Retorno: `{ score, energy, metrics, loading, error, hasPermissions,
 * requestPermissions, refresh }`.
 *
 * ## Uso manual (sem hook)
 *
 * ```ts
 * import {
 *   computeEnergyScore,
 *   getHealthProvider,
 *   lastDaysRange,
 * } from '@/lib/energy';
 *
 * const provider = getHealthProvider();
 *
 * const granted = await provider.requestPermissions();
 * if (!granted) return;
 *
 * const metrics = await provider.collect(lastDaysRange(14));
 * const result = computeEnergyScore(metrics);
 *
 * console.log(result.score);      // 0-100
 * console.log(result.band);       // 'low' | 'moderate' | 'high'
 * console.log(result.breakdown);  // SubScore[] com valor, peso e tier
 * ```
 *
 * ## Flowly Energy Engine (RISE / SAFTE-inspired)
 *
 * Motor de previsão biológica com dívida de sono (14 dias), ritmo circadiano,
 * inércia do sono e recovery score. Veja `README.md` para a matemática.
 *
 * ```ts
 * import {
 *   computeEnergyAtMoment,
 *   computeFlowlyEnergy,
 *   flowlyInputFromMetrics,
 *   generateEnergyCurve,
 * } from '@/lib/energy';
 *
 * const input = flowlyInputFromMetrics(metrics);
 * const now = computeFlowlyEnergy(input);                              // agora
 * const at15 = computeEnergyAtMoment(input, '2026-06-08T15:00:00Z');   // momento arbitrário
 * const curve = generateEnergyCurve(input);                            // curva do dia
 * ```
 *
 * ## Métricas coletadas
 *
 * | Sinal                    | Peso padrão |
 * | ------------------------ | ----------- |
 * | Horas de sono            | Muito alto  |
 * | Horário que acordou      | Alto        |
 * | Horário atual            | Alto        |
 * | Treino realizado hoje    | Médio       |
 * | HRV                      | Alto        |
 * | FC em repouso            | Médio       |
 * | Sono profundo            | Médio       |
 * | Sono REM                 | Médio       |
 * | Variabilidade do sono    | Médio       |
 * | Carga de treino (7 dias) | Médio       |
 *
 * Sinais ausentes são ignorados; os pesos restantes são re-normalizados.
 *
 * ## Personalizar configuração
 *
 * ```ts
 * import { computeEnergyScore, defaultConfig } from '@/lib/energy';
 *
 * const result = computeEnergyScore(metrics, {
 *   ...defaultConfig,
 *   bands: { moderate: 40, high: 70 },
 *   ranges: { ...defaultConfig.ranges, idealSleepHours: 7.5 },
 * });
 * ```
 *
 * ## Testes (métricas mockadas)
 *
 * ```ts
 * import { computeEnergyScore } from '@/lib/energy';
 *
 * const metrics = {
 *   sleepHours: 8,
 *   wakeTime: '2026-06-08T06:30:00.000Z',
 *   bedTime: '2026-06-07T22:30:00.000Z',
 *   sleepHistory: [{ date: '2026-06-08', sleepHours: 8 }],
 *   now: new Date().toISOString(),
 *   workoutToday: true,
 *   workoutMinutesToday: 45,
 *   hrvMs: 80,
 *   restingHeartRate: 50,
 *   deepSleepMin: 90,
 *   remSleepMin: 110,
 *   sleepVariability: 0.3,
 *   trainingLoad7d: 300,
 * };
 *
 * const { score, breakdown } = computeEnergyScore(metrics);
 * ```
 *
 * ## Exports principais
 *
 * - `useEnergyScore` — hook React (pipeline completo)
 * - `computeEnergyScore` — engine puro (sem side effects)
 * - `getHealthProvider` — provider da plataforma (iOS/Android)
 * - `defaultConfig`, `WEIGHT_TIERS` — configuração e pesos
 * - Tipos: `HealthMetrics`, `EnergyScore`, `SubScore`, `EnergyBand`, etc.
 */

export { AppleHealthProvider, emptyMetrics, getHealthProvider, HealthConnectProvider, type HealthDataProvider, lastDaysRange, type ProviderPlatform } from './collectors';
export { defaultConfig, type EnergyConfig, type MetricConfig, type NormalizationRanges, WEIGHT_TIERS } from './config';
export {
  type CircadianWave,
  computeCircadianEnergy,
  computeEnergyAtMoment,
  computeEnergyScore,
  computeFlowlyEnergy,
  computeRecoveryScore,
  computeSleepDebtHours,
  computeSleepDebtScore,
  computeSleepInertiaPenalty,
  computeTaskCompatibility,
  defaultFlowlyConfig,
  type EnergyCurveOptions,
  energyScoreToLevel,
  type FlowlyEngineConfig,
  flowlyInputFromMetrics,
  generateEnergyCurve,
  normalizeHrv,
  normalizeRestingHeartRate,
  normalizeSleepQuality,
} from './engine';
export { useEnergyScore, type UseEnergyScoreOptions, type UseEnergyScoreResult } from './hooks/useEnergyScore';
export type { DateRange, EnergyBand, EnergyCurvePoint, EnergyScore, FlowlyEnergyComponents, FlowlyEnergyResult, FlowlyEngineInput, HealthMetrics, MetricKey, SleepNight, SubScore, WeightTier } from './types';
