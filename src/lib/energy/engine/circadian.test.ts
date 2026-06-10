import { computeCircadianEnergy, computeSleepInertiaPenalty } from './circadian';
import { defaultFlowlyConfig } from './flowlyConfig';

const DAY_LENGTH = 16; // 8h sleep need -> 16h awake span

const at = (hoursAwake: number): number => computeCircadianEnergy(hoursAwake, DAY_LENGTH);

describe('computeCircadianEnergy', () => {
  it('peaks 2-4 hours after waking (morning peak)', () => {
    const morning = at(3);
    expect(morning).toBeGreaterThan(at(0));
    expect(morning).toBeGreaterThan(at(7));
    expect(morning).toBeGreaterThan(at(9.5));
    expect(morning).toBeGreaterThan(80);
  });

  it('dips 6-8 hours after waking (afternoon dip)', () => {
    const dip = at(7);
    expect(dip).toBeLessThan(at(3));
    expect(dip).toBeLessThan(at(9.5));
    expect(dip).toBeLessThan(at(4.5));
  });

  it('has a secondary peak 8-11 hours after waking', () => {
    const second = at(9.5);
    expect(second).toBeGreaterThan(at(7));
    expect(second).toBeGreaterThan(at(13));
    expect(second).toBeLessThan(at(3)); // smaller than the morning peak
  });

  it('declines toward bedtime after 12 hours awake', () => {
    expect(at(13)).toBeLessThan(at(12));
    expect(at(14)).toBeLessThan(at(13));
    expect(at(DAY_LENGTH)).toBeLessThan(30);
  });

  it('keeps decaying past bedtime', () => {
    expect(at(DAY_LENGTH + 2)).toBeLessThan(at(DAY_LENGTH));
  });

  it('is a continuous curve (no steps)', () => {
    for (let t = 0; t < 18; t += 0.1) {
      const delta = Math.abs(at(t + 0.1) - at(t));
      expect(delta).toBeLessThan(3);
    }
  });

  it('always stays within 0-100', () => {
    for (let t = 0; t <= 24; t += 0.25) {
      const value = at(t);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});

describe('computeSleepInertiaPenalty', () => {
  const { maxPenalty, durationHours } = defaultFlowlyConfig.inertia;

  it('applies the full penalty at the moment of waking', () => {
    expect(computeSleepInertiaPenalty(0)).toBeCloseTo(maxPenalty, 5);
  });

  it('applies half of the penalty at the midpoint of the window', () => {
    expect(computeSleepInertiaPenalty(durationHours / 2)).toBeCloseTo(maxPenalty / 2, 5);
  });

  it('disappears completely after 90 minutes', () => {
    expect(computeSleepInertiaPenalty(durationHours)).toBe(0);
    expect(computeSleepInertiaPenalty(5)).toBe(0);
  });

  it('decreases monotonically within the window', () => {
    let previous = computeSleepInertiaPenalty(0);
    for (let t = 0.1; t < durationHours; t += 0.1) {
      const penalty = computeSleepInertiaPenalty(t);
      expect(penalty).toBeLessThan(previous);
      previous = penalty;
    }
  });
});
