import { defaultConfig } from '../config';
import { circadianAlertness, sleepReservoirScore, timeAwakeScore, wakeAlignmentScore } from './safte';

describe('SAFTE-inspired score helpers', () => {
  const { ranges } = defaultConfig;

  it('fills the sleep reservoir up to the ideal duration', () => {
    expect(sleepReservoirScore(4, ranges)).toBe(50);
    expect(sleepReservoirScore(8, ranges)).toBe(100);
  });

  it('penalizes oversleeping beyond the ideal duration', () => {
    expect(sleepReservoirScore(9, ranges)).toBe(92);
  });

  it('models circadian alertness across the day', () => {
    expect(circadianAlertness('2026-06-09T16:00:00.000Z')).toBeGreaterThan(50);
    expect(circadianAlertness('2026-06-09T04:00:00.000Z')).toBeLessThan(50);
  });

  it('depletes energy as time awake increases', () => {
    expect(timeAwakeScore('2026-06-09T06:00:00.000Z', '2026-06-09T06:00:00.000Z', ranges)).toBe(100);
    expect(timeAwakeScore('2026-06-09T06:00:00.000Z', '2026-06-09T22:00:00.000Z', ranges)).toBe(0);
  });

  it('rewards wake times close to the ideal hour', () => {
    const alignedWake = new Date('2026-06-09T12:00:00.000Z');
    alignedWake.setHours(6, 30, 0, 0);

    const lateWake = new Date('2026-06-09T12:00:00.000Z');
    lateWake.setHours(12, 0, 0, 0);

    expect(wakeAlignmentScore(alignedWake.toISOString(), ranges)).toBe(100);
    expect(wakeAlignmentScore(lateWake.toISOString(), ranges)).toBeLessThan(100);
  });
});
