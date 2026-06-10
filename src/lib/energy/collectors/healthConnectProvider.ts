import type * as HealthConnectModule from 'react-native-health-connect';
import type { Permission, RecordResult } from 'react-native-health-connect/lib/typescript/types';
import type { SleepStage } from 'react-native-health-connect/lib/typescript/types/base.types';

import type { DateRange, HealthMetrics, SleepNight } from '../types';
import { average, DAY_MS, emptyMetrics, isoDayKey, isSameDay, lastDaysRange, minutesBetween, stdDev, sum } from './shared';
import type { HealthDataProvider } from './types';

/** Health Connect `SleepSessionRecord.StageType` codes. */
const STAGE = {
  SLEEPING: 2,
  LIGHT: 4,
  DEEP: 5,
  REM: 6,
} as const;
const ASLEEP_STAGES = new Set<number>([STAGE.SLEEPING, STAGE.LIGHT, STAGE.DEEP, STAGE.REM]);

type HealthConnect = typeof HealthConnectModule;

const loadHealthConnect = (): HealthConnect | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    return require('react-native-health-connect') as HealthConnect;
  } catch {
    return null;
  }
};

const READ_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
  { accessType: 'read', recordType: 'RestingHeartRate' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
];

const stageMinutes = (stages: SleepStage[], stage: number): number => sum(stages.filter((s) => s.stage === stage).map((s) => minutesBetween(s.startTime, s.endTime)));

const asleepMinutes = (stages: SleepStage[]): number => sum(stages.filter((s) => ASLEEP_STAGES.has(s.stage)).map((s) => minutesBetween(s.startTime, s.endTime)));

const sleepFromSessions = (sessions: RecordResult<'SleepSession'>[]): Pick<HealthMetrics, 'sleepHours' | 'wakeTime' | 'bedTime' | 'sleepHistory' | 'deepSleepMin' | 'remSleepMin' | 'sleepVariability'> => {
  if (!sessions.length) {
    return {
      sleepHours: null,
      wakeTime: null,
      bedTime: null,
      sleepHistory: null,
      deepSleepMin: null,
      remSleepMin: null,
      sleepVariability: null,
    };
  }

  const sorted = sessions.slice().sort((a, b) => a.endTime.localeCompare(b.endTime));
  const last = sorted[sorted.length - 1]!;
  const lastStages = last.stages ?? [];

  // Duration falls back to the session span when no stages are present.
  const lastMinutes = lastStages.length ? asleepMinutes(lastStages) : minutesBetween(last.startTime, last.endTime);

  // Per-night totals (sleep history + variability).
  const perNight = new Map<string, number>();
  sorted.forEach((session) => {
    const stages = session.stages ?? [];
    const minutes = stages.length ? asleepMinutes(stages) : minutesBetween(session.startTime, session.endTime);
    const key = isoDayKey(session.endTime);
    perNight.set(key, (perNight.get(key) ?? 0) + minutes);
  });
  const sleepHistory: SleepNight[] = [...perNight.entries()].map(([date, minutes]) => ({ date, sleepHours: minutes / 60 })).sort((a, b) => a.date.localeCompare(b.date));
  const variability = stdDev(sleepHistory.map((n) => n.sleepHours));

  return {
    sleepHours: lastMinutes / 60,
    wakeTime: last.endTime,
    bedTime: last.startTime,
    sleepHistory,
    deepSleepMin: lastStages.length ? stageMinutes(lastStages, STAGE.DEEP) : null,
    remSleepMin: lastStages.length ? stageMinutes(lastStages, STAGE.REM) : null,
    sleepVariability: variability,
  };
};

/** Health Connect data provider for Android. */
export class HealthConnectProvider implements HealthDataProvider {
  readonly platform = 'android' as const;

  private hc: HealthConnect | null = loadHealthConnect();

  private initialized = false;

  private async ensureInitialized(): Promise<boolean> {
    if (!this.hc) return false;
    if (this.initialized) return true;
    try {
      this.initialized = await this.hc.initialize();
    } catch {
      this.initialized = false;
    }
    return this.initialized;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.hc) return false;
    try {
      const status = await this.hc.getSdkStatus();
      return status === this.hc.SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch {
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (!(await this.ensureInitialized()) || !this.hc) return false;
    try {
      const granted = await this.hc.requestPermission(READ_PERMISSIONS);
      return granted.length > 0;
    } catch {
      return false;
    }
  }

  async collect(range: DateRange = lastDaysRange()): Promise<HealthMetrics> {
    const now = new Date();
    if (!(await this.ensureInitialized()) || !this.hc) {
      return emptyMetrics(now);
    }

    const timeRangeFilter = {
      operator: 'between' as const,
      startTime: range.startDate,
      endTime: range.endDate,
    };
    const read = async <T extends Parameters<HealthConnect['readRecords']>[0]>(recordType: T) => {
      try {
        const { records } = await this.hc!.readRecords(recordType, {
          timeRangeFilter,
        });
        return records;
      } catch {
        return [];
      }
    };

    const [sleepRecords, hrvRecords, rhrRecords, exerciseRecords] = await Promise.all([read('SleepSession'), read('HeartRateVariabilityRmssd'), read('RestingHeartRate'), read('ExerciseSession')]);

    const sleep = sleepFromSessions(sleepRecords as RecordResult<'SleepSession'>[]);

    const hrvMs = average((hrvRecords as RecordResult<'HeartRateVariabilityRmssd'>[]).map((r) => r.heartRateVariabilityMillis));

    const rhrSorted = (rhrRecords as RecordResult<'RestingHeartRate'>[]).slice().sort((a, b) => b.time.localeCompare(a.time));
    const restingHeartRate = rhrSorted.length ? rhrSorted[0]!.beatsPerMinute : null;

    const sessions = exerciseRecords as RecordResult<'ExerciseSession'>[];
    const todays = sessions.filter((s) => isSameDay(s.startTime, now));
    const workoutMinutesToday = todays.length ? sum(todays.map((s) => minutesBetween(s.startTime, s.endTime))) : null;
    // Keep the 7-day semantics even when the collection range is wider (14d).
    const sevenDaysAgo = now.getTime() - 7 * DAY_MS;
    const lastWeek = sessions.filter((s) => new Date(s.startTime).getTime() >= sevenDaysAgo);
    const trainingLoad7d = sessions.length ? sum(lastWeek.map((s) => minutesBetween(s.startTime, s.endTime))) : null;

    return {
      ...sleep,
      now: now.toISOString(),
      hrvMs,
      restingHeartRate,
      workoutToday: todays.length > 0,
      workoutMinutesToday,
      trainingLoad7d,
    };
  }
}
