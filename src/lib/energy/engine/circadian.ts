import type { FlowlyEngineConfig } from './flowlyConfig';
import { defaultFlowlyConfig } from './flowlyConfig';
import { clamp } from './normalize';

/**
 * Circadian Rhythm Engine + Sleep Inertia.
 *
 * The curve lives in "hours awake" space (t = hours since wake-up), which
 * automatically anchors the rhythm to the user's real schedule instead of
 * wall-clock time. It is a continuous sum of analytic functions:
 *
 *   C(t) = baseline
 *        + morningPeak.amplitude  * G(t; 3,   1.5)   // peak     2-4h  awake
 *        + afternoonDip.amplitude * G(t; 7,   1.3)   // dip      6-8h  awake
 *        + secondPeak.amplitude   * G(t; 9.5, 1.6)   // peak     8-11h awake
 *        - eveningDecline(t)                          // decline  12h+  awake
 *
 * where G(t; c, w) = exp(-(t - c)² / (2w²)) is a Gaussian bump and the
 * evening decline is a smoothstep ramp from `startHoursAwake` (12h) to
 * bedtime, with an additional linear decay past bedtime. The result is
 * clamped to 0-100. Being a sum of smooth functions, C(t) is C¹-continuous
 * (no steps).
 */

/** Gaussian bump centered at `center` with standard deviation `width`. */
const gaussian = (x: number, center: number, width: number): number => Math.exp(-((x - center) ** 2) / (2 * width * width));

/** Hermite smoothstep clamped to [0, 1] (C¹-continuous ramp). */
const smoothstep01 = (x: number): number => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Circadian alertness (0-100) for a user that has been awake `hoursAwake`
 * hours, out of a wake->bedtime span of `dayLengthHours`.
 */
export const computeCircadianEnergy = (hoursAwake: number, dayLengthHours: number, config: FlowlyEngineConfig = defaultFlowlyConfig): number => {
  const c = config.circadian;
  const t = Math.max(0, hoursAwake);

  const wave = (w: { centerHoursAwake: number; widthHours: number; amplitude: number }): number => w.amplitude * gaussian(t, w.centerHoursAwake, w.widthHours);

  let energy = c.baseline + wave(c.morningPeak) + wave(c.afternoonDip) + wave(c.secondPeak);

  // Evening decline: smooth ramp from the decline start (12h awake) down to
  // `depth` points at bedtime.
  const declineSpan = Math.max(1, dayLengthHours - c.eveningDecline.startHoursAwake);
  energy -= c.eveningDecline.depth * smoothstep01((t - c.eveningDecline.startHoursAwake) / declineSpan);

  // Past bedtime the pressure keeps building linearly.
  if (t > dayLengthHours) {
    energy -= (t - dayLengthHours) * c.postBedtimeDecayPerHour;
  }

  return clamp(energy);
};

/**
 * Sleep Inertia — temporary grogginess right after waking.
 *
 * Math: a half-cosine ease-out over the inertia window (default 90 min):
 *
 *   penalty(t) = maxPenalty * 0.5 * (1 + cos(π * t / duration)),  t ∈ [0, duration)
 *   penalty(t) = 0,                                               t ≥ duration
 *
 * This gives the full penalty at the moment of waking, half at the midpoint
 * and exactly 0 at the end of the window, with zero slope at both ends
 * (smooth fade instead of a hard cutoff).
 */
export const computeSleepInertiaPenalty = (hoursAwake: number, config: FlowlyEngineConfig = defaultFlowlyConfig): number => {
  const { durationHours, maxPenalty } = config.inertia;
  if (hoursAwake < 0 || hoursAwake >= durationHours) return 0;
  return maxPenalty * 0.5 * (1 + Math.cos((Math.PI * hoursAwake) / durationHours));
};
