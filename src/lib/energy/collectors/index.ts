import { Platform } from 'react-native';

import type { DateRange, HealthMetrics } from '../types';
import { AppleHealthProvider } from './appleHealthProvider';
import { HealthConnectProvider } from './healthConnectProvider';
import { emptyMetrics } from './shared';
import type { HealthDataProvider } from './types';

/* eslint-disable class-methods-use-this */
/** Fallback provider for unsupported platforms (web, etc.). */
class NoopProvider implements HealthDataProvider {
  readonly platform = 'unsupported' as const;

  async isAvailable(): Promise<boolean> {
    return false;
  }

  async requestPermissions(): Promise<boolean> {
    return false;
  }

  async collect(_range?: DateRange): Promise<HealthMetrics> {
    return emptyMetrics();
  }
}
/* eslint-enable class-methods-use-this */

let cached: HealthDataProvider | null = null;

/** Returns the platform-appropriate health data provider (singleton). */
export const getHealthProvider = (): HealthDataProvider => {
  if (cached) return cached;
  if (Platform.OS === 'ios') {
    cached = new AppleHealthProvider();
  } else if (Platform.OS === 'android') {
    cached = new HealthConnectProvider();
  } else {
    cached = new NoopProvider();
  }
  return cached;
};

export { AppleHealthProvider } from './appleHealthProvider';
export { HealthConnectProvider } from './healthConnectProvider';
export { emptyMetrics, lastDaysRange } from './shared';
export type { HealthDataProvider, ProviderPlatform } from './types';
