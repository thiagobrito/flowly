import type { HealthMetrics } from '@/lib/energy/types';

import { applySleepProfile, minutesToTimeString, timeStringToMinutes } from './apply';

const emptyMetrics = (nowIso: string): HealthMetrics => ({
  sleepHours: null,
  wakeTime: null,
  bedTime: null,
  sleepHistory: null,
  now: nowIso,
  workoutToday: false,
  workoutMinutesToday: null,
  hrvMs: null,
  restingHeartRate: null,
  deepSleepMin: null,
  remSleepMin: null,
  sleepVariability: null,
  trainingLoad7d: null,
});

// 15/jun 12:00 no fuso do app (America/Sao_Paulo, UTC-3).
const NOON = '2026-06-15T12:00:00.000-03:00';

const clockInAppTz = (iso: string | null): string => {
  expect(iso).not.toBeNull();
  return new Date(iso!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
};

const dayInAppTz = (iso: string | null): string => new Date(iso!).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

describe('timeStringToMinutes / minutesToTimeString', () => {
  it('parses valid HH:MM values', () => {
    expect(timeStringToMinutes('07:30')).toBe(450);
    expect(timeStringToMinutes('23:00')).toBe(1380);
    expect(timeStringToMinutes('0:05')).toBe(5);
  });

  it('rejects invalid values', () => {
    expect(timeStringToMinutes('24:00')).toBeNull();
    expect(timeStringToMinutes('7h30')).toBeNull();
    expect(timeStringToMinutes('')).toBeNull();
    expect(timeStringToMinutes(null)).toBeNull();
  });

  it('formats and wraps minutes', () => {
    expect(minutesToTimeString(450)).toBe('07:30');
    expect(minutesToTimeString(-15)).toBe('23:45');
    expect(minutesToTimeString(24 * 60 + 30)).toBe('00:30');
  });
});

describe('applySleepProfile', () => {
  it('returns metrics unchanged without a profile or usable fields', () => {
    const metrics = emptyMetrics(NOON);
    expect(applySleepProfile(metrics, null)).toBe(metrics);
    expect(applySleepProfile(metrics, { hasDevice: true })).toBe(metrics);
  });

  it('synthesizes wake/bed/sleepHours from usual times when health data is missing', () => {
    const result = applySleepProfile(emptyMetrics(NOON), { usualWakeTime: '07:00', usualBedTime: '23:00' });

    expect(clockInAppTz(result.wakeTime)).toBe('07:00');
    expect(clockInAppTz(result.bedTime)).toBe('23:00');
    expect(dayInAppTz(result.wakeTime)).toBe('2026-06-15');
    expect(dayInAppTz(result.bedTime)).toBe('2026-06-14'); // noite anterior
    expect(result.sleepHours).toBe(8);
  });

  it('keeps a post-midnight bedtime on the wake day', () => {
    const result = applySleepProfile(emptyMetrics(NOON), { usualWakeTime: '08:00', usualBedTime: '01:00' });

    expect(dayInAppTz(result.bedTime)).toBe('2026-06-15');
    expect(result.sleepHours).toBe(7);
  });

  it('does not touch health data when there is no override', () => {
    const metrics: HealthMetrics = {
      ...emptyMetrics(NOON),
      wakeTime: '2026-06-15T06:12:00.000-03:00',
      bedTime: '2026-06-14T22:40:00.000-03:00',
      sleepHours: 7.53,
    };
    const result = applySleepProfile(metrics, { usualWakeTime: '09:00', usualBedTime: '23:30' });

    expect(result.wakeTime).toBe(metrics.wakeTime);
    expect(result.bedTime).toBe(metrics.bedTime);
    expect(result.sleepHours).toBe(metrics.sleepHours);
  });

  it('fills only the missing field when health data is partial', () => {
    const metrics: HealthMetrics = { ...emptyMetrics(NOON), wakeTime: '2026-06-15T06:12:00.000-03:00' };
    const result = applySleepProfile(metrics, { usualWakeTime: '09:00', usualBedTime: '23:00' });

    expect(result.wakeTime).toBe(metrics.wakeTime); // saúde vence o usual
    expect(clockInAppTz(result.bedTime)).toBe('23:00');
    expect(result.sleepHours).toBeCloseTo(7.2, 1);
  });

  it('applies the day override even over health data', () => {
    const metrics: HealthMetrics = {
      ...emptyMetrics(NOON),
      wakeTime: '2026-06-15T06:12:00.000-03:00',
      bedTime: '2026-06-14T22:40:00.000-03:00',
      sleepHours: 7.53,
    };
    const result = applySleepProfile(metrics, {
      usualWakeTime: '07:00',
      overrides: { '2026-06-15': { wakeTime: '08:30', bedTime: '00:15' } },
    });

    expect(clockInAppTz(result.wakeTime)).toBe('08:30');
    expect(clockInAppTz(result.bedTime)).toBe('00:15');
    expect(dayInAppTz(result.bedTime)).toBe('2026-06-15');
    expect(result.sleepHours).toBe(8.25);
  });

  it('uses the override of the reference day, not of today', () => {
    const result = applySleepProfile(emptyMetrics(NOON), { usualWakeTime: '07:00', overrides: { '2026-06-14': { wakeTime: '10:00' } } }, '2026-06-14T20:00:00.000-03:00');

    expect(clockInAppTz(result.wakeTime)).toBe('10:00');
    expect(dayInAppTz(result.wakeTime)).toBe('2026-06-14');
  });

  it('never touches physiological metrics', () => {
    const metrics: HealthMetrics = { ...emptyMetrics(NOON), hrvMs: 55, restingHeartRate: 52, deepSleepMin: 80 };
    const result = applySleepProfile(metrics, { usualWakeTime: '07:00', usualBedTime: '23:00' });

    expect(result.hrvMs).toBe(55);
    expect(result.restingHeartRate).toBe(52);
    expect(result.deepSleepMin).toBe(80);
  });
});
