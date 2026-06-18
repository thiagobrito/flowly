import type { AppleHealthKit as AppleHealthKitType, HealthInputOptions, HealthKitPermissions, HealthValue, HKWorkoutQueriedSampleType } from 'react-native-health';

import type { DateRange, HealthMetrics, SleepNight } from '../types';
import { average, DAY_MS, emptyMetrics, isSameDay, lastDaysRange, mainSleepSession, minutesBetween, sleepHistoryFromIntervals, stdDev, sum, unionMinutes } from './shared';
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
    const mod = require('react-native-health');
    // The package assigns `module.exports` directly, so a raw require has no
    // `.default`; fall back to the module object itself.
    const hk = (mod?.default ?? mod) as AppleHealthKitType | undefined;
    if (hk && typeof hk.initHealthKit === 'function') return hk;

    // New Architecture: the library builds its export with
    // `Object.assign({}, NativeModules.AppleHealthKit, ...)`, which drops the
    // native methods (they are not own enumerable properties on the interop
    // module). Reach for the native module directly and layer Constants on top.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const { NativeModules } = require('react-native');
    const native = NativeModules.AppleHealthKit;
    if (native && typeof native.initHealthKit === 'function') {
      return Object.create(native, { Constants: { value: hk?.Constants } }) as AppleHealthKitType;
    }

    return hk ?? null;
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

const sleepFromSamples = (samples: AppleSleepSample[]): Pick<HealthMetrics, 'sleepHours' | 'wakeTime' | 'bedTime' | 'sleepHistory' | 'deepSleepMin' | 'remSleepMin' | 'sleepVariability'> => {
  // Normalize to {start,end} so the shared interval helpers can merge overlaps.
  const asleep = samples.filter((s) => ASLEEP_VALUES.has(s.value)).map((s) => ({ start: s.startDate, end: s.endDate, value: s.value }));
  if (!asleep.length) {
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

  // Main sleep session (longest recent cluster) — avoids lumping naps and
  // double-counting overlapping samples from multiple data sources.
  const mainNight = mainSleepSession(asleep);
  const wakeTime = mainNight.reduce((latest, s) => (s.end > latest ? s.end : latest), mainNight[0]!.end);
  const bedTime = mainNight.reduce((earliest, s) => (s.start < earliest ? s.start : earliest), mainNight[0]!.start);
  const lastNightMinutes = unionMinutes(mainNight);
  const deepMin = unionMinutes(mainNight.filter((s) => s.value === 'DEEP'));
  const remMin = unionMinutes(mainNight.filter((s) => s.value === 'REM'));

  // Nightly totals across the range (sleep history + variability).
  const sleepHistory: SleepNight[] = sleepHistoryFromIntervals(asleep);
  const variability = stdDev(sleepHistory.map((n) => n.sleepHours));

  return {
    sleepHours: lastNightMinutes / 60,
    wakeTime,
    bedTime,
    sleepHistory,
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
    if (!this.hk) throw new Error('Módulo nativo do HealthKit não encontrado no app.');
    const Permissions = this.hk.Constants?.Permissions;
    if (!Permissions) throw new Error('Constantes do HealthKit indisponíveis.');
    const permissions: HealthKitPermissions = {
      permissions: {
        read: [Permissions.SleepAnalysis, Permissions.HeartRateVariability, Permissions.RestingHeartRate, Permissions.HeartRate, Permissions.Workout, Permissions.ActiveEnergyBurned],
        write: [],
      },
    };
    return new Promise((resolve, reject) => {
      try {
        this.hk!.initHealthKit(permissions, (err) => (err ? reject(new Error(`initHealthKit: ${String(err)}`)) : resolve(true)));
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
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
    // Keep the 7-day semantics even when the collection range is wider (14d).
    const sevenDaysAgo = now.getTime() - 7 * DAY_MS;
    const lastWeek = workouts.filter((w) => w.start && new Date(w.start).getTime() >= sevenDaysAgo);
    const trainingLoad7d = workouts.length ? sum(lastWeek.map(workoutMinutes)) : null;

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
