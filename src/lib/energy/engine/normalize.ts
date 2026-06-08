/** Clamp a value to the [min, max] range (defaults to 0-100). */
export const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));

/**
 * Linearly map `value` from the `worst`..`best` interval onto 0..100, clamped.
 * Works in both directions (best may be lower than worst).
 */
export const linear = (value: number, worst: number, best: number): number => {
  if (best === worst) return 0;
  return clamp(((value - worst) / (best - worst)) * 100);
};

/**
 * Triangular response peaking at `ideal` and decaying to 0 once the value is
 * `tolerance` units away on either side.
 */
export const triangular = (value: number, ideal: number, tolerance: number): number => {
  if (tolerance <= 0) return value === ideal ? 100 : 0;
  const diff = Math.abs(value - ideal);
  return clamp(100 - (diff / tolerance) * 100);
};

/** Decimal local hour (0-24) for an ISO timestamp. */
export const hourOfDay = (iso: string): number => {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
};

/** Difference in hours between two ISO timestamps (`later` - `earlier`). */
export const hoursBetween = (earlierIso: string, laterIso: string): number => {
  const ms = new Date(laterIso).getTime() - new Date(earlierIso).getTime();
  return ms / (1000 * 60 * 60);
};
