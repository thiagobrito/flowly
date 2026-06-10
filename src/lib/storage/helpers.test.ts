import { cloneRawValue, deepClone, getFallbackState, getStringSizeInBytes, isCompatibleStateShape, toHydratedState } from './helpers';

describe('storage helpers', () => {
  it('deep-clones nested objects and preserves dates', () => {
    const source = { count: 1, nested: { ok: true }, createdAt: new Date('2026-06-09T10:00:00.000Z') };
    const cloned = deepClone(source);

    expect(cloned).toEqual(source);
    expect(cloned).not.toBe(source);
    expect(cloned.nested).not.toBe(source.nested);
    expect(cloned.createdAt).not.toBe(source.createdAt);
  });

  it('throws on circular structures', () => {
    const source: { self?: unknown } = {};
    source.self = source;

    expect(() => deepClone(source)).toThrow('Converting circular structure to JSON');
  });

  it('measures string size in bytes', () => {
    expect(getStringSizeInBytes('abc')).toBeGreaterThan(0);
    expect(getStringSizeInBytes('')).toBe(0);
  });

  it('validates compatible persisted shapes', () => {
    expect(isCompatibleStateShape({ loaded: false }, { loaded: true })).toBe(true);
    expect(isCompatibleStateShape([], [])).toBe(true);
    expect(isCompatibleStateShape({ loaded: false }, [])).toBe(false);
  });

  it('hydrates objects with loaded metadata and falls back when incompatible', () => {
    const initial = { loaded: false, count: 0 };
    const hydrated = toHydratedState(initial, { count: 2, lastUpdate: '2026-06-09T10:00:00.000Z' });

    expect(hydrated).toMatchObject({ count: 2, loaded: true, lastUpdate: '2026-06-09T10:00:00.000Z' });
    expect(toHydratedState(initial, null)).toEqual(getFallbackState(initial));
    expect(cloneRawValue({ ok: true })).toEqual({ ok: true });
  });
});
