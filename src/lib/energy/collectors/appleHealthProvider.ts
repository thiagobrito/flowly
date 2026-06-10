import type { AppleHealthKit as AppleHealthKitType, HealthInputOptions, HealthKitPermissions, HealthValue, HKWorkoutQueriedSampleType } from 'react-native-health';

import type { DateRange, HealthMetrics } from '../types';
import { average, dayKey, emptyMetrics, isSameDay, lastDaysRange, minutesBetween, stdDev, sum } from './shared';
import type { HealthDataProvider } from './types';

/** Sleep sample as returned at runtime by `getSleepSamples`. */
interface AppleSleepSample {
  startDate: string;
  endDate: string;
  value: string;
}

const ASLEEP_VALUES = new Set(['ASLEEP', 'CORE', 'DEEP', 'REM']);

/**
 * Lazily require the native module so importing this file never crashes on
 * platforms where HealthKit is unavailable (web, Android, Jest).
 */
const loadHealthKit = (): AppleHealthKitType | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    return require('react-native-health').default as AppleHealthKitType;
  } catch {
    return null;
  }
};

const promisify = <T>(fn: (options: HealthInputOptions, cb: (err: string | null, res: T) => void) => void, options: HealthInputOptions): Promise<T | null> =>
  new Promise((resolve) => {
    try {
      fn(options, (err, res) => resolve(err ? null : res));
    } catch {
      resolve(null);
    }
  });

const sleepFromSamples = (samples: AppleSleepSample[]): Pick<HealthMetrics, 'sleepHours' | 'wakeTime' | 'deepSleepMin' | 'remSleepMin' | 'sleepVariability'> => {
  const asleep = samples.filter((s) => ASLEEP_VALUES.has(s.value));
  if (!asleep.length) {
    return {
      sleepHours: null,
      wakeTime: null,
      deepSleepMin: null,
      remSleepMin: null,
      sleepVariability: null,
    };
  }

  // Latest awakening across the asleep samples.
  const wakeTime = asleep.reduce((latest, s) => (s.endDate > latest ? s.endDate : latest), asleep[0]!.endDate);
  const wakeKey = dayKey(wakeTime);

  // Samples belonging to the most recent night (bucketed by wake day).
  const lastNight = asleep.filter((s) => dayKey(s.endDate) === wakeKey);
  const lastNightMinutes = sum(lastNight.map((s) => minutesBetween(s.startDate, s.endDate)));
  const deepMin = sum(lastNight.filter((s) => s.value === 'DEEP').map((s) => minutesBetween(s.startDate, s.endDate)));
  const remMin = sum(lastNight.filter((s) => s.value === 'REM').map((s) => minutesBetween(s.startDate, s.endDate)));

  // Nightly totals across the range to estimate sleep variability (hours).
  const perNight = new Map<string, number>();
  asleep.forEach((s) => {
    const key = dayKey(s.endDate);
    perNight.set(key, (perNight.get(key) ?? 0) + minutesBetween(s.startDate, s.endDate));
  });
  const nightlyHours = [...perNight.values()].map((m) => m / 60);
  const variability = stdDev(nightlyHours);

  return {
    sleepHours: lastNightMinutes / 60,
    wakeTime,
    deepSleepMin: deepMin,
    remSleepMin: remMin,
    sleepVariability: variability,
  };
};

const workoutMinutes = (w: HKWorkoutQueriedSampleType): number => (w.start && w.end ? minutesBetween(w.start, w.end) : (w.duration ?? 0) / 60);

/** Apple Health (HealthKit) data provider for iOS. */
export class AppleHealthProvider implements HealthDataProvider {
  readonly platform = 'ios' as const;

  private hk: AppleHealthKitType | null = loadHealthKit();

  async isAvailable(): Promise<boolean> {
    if (!this.hk) return false;
    return new Promise((resolve) => {
      this.hk!.isAvailable((err, available) => resolve(!err && !!available));
    });
  }

  async requestPermissions(): Promise<boolean> {
    if (!this.hk) return false;
    const { Permissions } = this.hk.Constants;
    const permissions: HealthKitPermissions = {
      permissions: {
        read: [Permissions.SleepAnalysis, Permissions.HeartRateVariability, Permissions.RestingHeartRate, Permissions.HeartRate, Permissions.Workout, Permissions.ActiveEnergyBurned],
        write: [],
      },
    };
    return new Promise((resolve) => {
      this.hk!.initHealthKit(permissions, (err) => resolve(!err));
    });
  }

  async collect(range: DateRange = lastDaysRange()): Promise<HealthMetrics> {
    const now = new Date();
    if (!this.hk) return emptyMetrics(now);

    const options: HealthInputOptions = {
      startDate: range.startDate,
      endDate: range.endDate,
      ascending: true,
    };

    const { hk } = this;
    const [sleepRes, hrvRes, rhrRes, workoutRes] = await Promise.all([
      promisify<HealthValue[]>((o, cb) => hk.getSleepSamples(o, cb), options),
      promisify<HealthValue[]>((o, cb) => hk.getHeartRateVariabilitySamples(o, cb), options),
      promisify<HealthValue[]>((o, cb) => hk.getRestingHeartRateSamples(o, cb), options),
      new Promise<HKWorkoutQueriedSampleType[] | null>((resolve) => {
        try {
          hk.getAnchoredWorkouts(options, (err, res) => resolve(err ? null : (res?.data ?? null)));
        } catch {
          resolve(null);
        }
      }),
    ]);

    const sleep = sleepFromSamples((sleepRes ?? []) as unknown as AppleSleepSample[]);

    // Apple HRV (SDNN) is reported in milliseconds by react-native-health.
    const hrvMs = average((hrvRes ?? []).map((s) => s.value));

    // Most recent resting heart rate sample.
    const rhrSorted = (rhrRes ?? []).slice().sort((a, b) => b.endDate.localeCompare(a.endDate));
    const restingHeartRate = rhrSorted.length ? rhrSorted[0]!.value : null;

    const workouts = workoutRes ?? [];
    const todays = workouts.filter((w) => w.start && isSameDay(w.start, now));
    const workoutMinutesToday = todays.length ? sum(todays.map(workoutMinutes)) : null;
    const trainingLoad7d = workouts.length ? sum(workouts.map(workoutMinutes)) : null;

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
