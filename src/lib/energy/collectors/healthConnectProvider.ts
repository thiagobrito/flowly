import type * as HealthConnectModule from 'react-native-health-connect';
import type { Permission, RecordResult } from 'react-native-health-connect/lib/typescript/types';
import type { SleepStage } from 'react-native-health-connect/lib/typescript/types/base.types';

import type { DateRange, HealthMetrics, SleepNight } from '../types';
import { average, DAY_MS, emptyMetrics, isSameDay, lastDaysRange, mainSleepSession, minutesBetween, sleepHistoryFromIntervals, stdDev, sum, unionMinutes } from './shared';
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

/** One asleep interval, carrying the stage when the session reports stages. */
interface AsleepSegment {
  start: string;
  end: string;
  stage: number | null;
}

/**
 * Flattens sessions into asleep intervals. Sessions that report stages
 * contribute one interval per asleep stage; stage-less sessions contribute
 * their whole span as a single (stage-unknown) interval.
 */
const segmentsFromSessions = (sessions: RecordResult<'SleepSession'>[]): AsleepSegment[] => {
  const segments: AsleepSegment[] = [];
  sessions.forEach((session) => {
    const stages: SleepStage[] = session.stages ?? [];
    const asleep = stages.filter((s) => ASLEEP_STAGES.has(s.stage));
    if (asleep.length) {
      asleep.forEach((s) => segments.push({ start: s.startTime, end: s.endTime, stage: s.stage }));
    } else {
      segments.push({ start: session.startTime, end: session.endTime, stage: null });
    }
  });
  return segments;
};

const sleepFromSessions = (sessions: RecordResult<'SleepSession'>[]): Pick<HealthMetrics, 'sleepHours' | 'wakeTime' | 'bedTime' | 'sleepHistory' | 'deepSleepMin' | 'remSleepMin' | 'sleepVariability'> => {
  const segments = segmentsFromSessions(sessions);
  if (!segments.length) {
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

  // Main sleep session (longest recent cluster) with overlaps merged once.
  const mainNight = mainSleepSession(segments);
  const wakeTime = mainNight.reduce((latest, s) => (s.end > latest ? s.end : latest), mainNight[0]!.end);
  const bedTime = mainNight.reduce((earliest, s) => (s.start < earliest ? s.start : earliest), mainNight[0]!.start);
  const lastMinutes = unionMinutes(mainNight);
  const hasStages = mainNight.some((s) => s.stage != null);

  // Per-night totals (sleep history + variability).
  const sleepHistory: SleepNight[] = sleepHistoryFromIntervals(segments);
  const variability = stdDev(sleepHistory.map((n) => n.sleepHours));

  return {
    sleepHours: lastMinutes / 60,
    wakeTime,
    bedTime,
    sleepHistory,
    deepSleepMin: hasStages ? unionMinutes(mainNight.filter((s) => s.stage === STAGE.DEEP)) : null,
    remSleepMin: hasStages ? unionMinutes(mainNight.filter((s) => s.stage === STAGE.REM)) : null,
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
