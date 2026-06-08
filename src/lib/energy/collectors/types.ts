import type { DateRange, HealthMetrics } from '../types';

export type ProviderPlatform = 'ios' | 'android' | 'unsupported';

/**
 * Abstraction over the platform health source ("Coletor de Dados").
 * Both Apple Health and Health Connect implementations normalize their data
 * into the same {@link HealthMetrics} shape consumed by the Energy Engine.
 */
export interface HealthDataProvider {
  readonly platform: ProviderPlatform;
  /** Whether the underlying health store is available on this device. */
  isAvailable(): Promise<boolean>;
  /** Request the read permissions required by the Energy Score. */
  requestPermissions(): Promise<boolean>;
  /** Collect and normalize the metrics over `range` (defaults to last 7 days). */
  collect(range?: DateRange): Promise<HealthMetrics>;
}
