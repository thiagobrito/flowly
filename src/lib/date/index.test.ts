import { APP_TIME_ZONE, localDateKey, startOfLocalDay, toLocalISOString } from './index';

describe('date helpers', () => {
  // Instante que, em UTC, já é 15/jun, mas no fuso do app (UTC-3) ainda é 14/jun 23:30.
  const lateNight = new Date('2026-06-15T02:30:58.997Z');

  it('formats local ISO in the app time zone, not the device/UTC day', () => {
    const iso = toLocalISOString(lateNight);
    expect(iso.startsWith('2026-06-14T23:30:58.997')).toBe(true);
    expect(iso).toMatch(/-03:00$/);
    expect(iso.endsWith('Z')).toBe(false);
  });

  it('builds a local date key in the app time zone', () => {
    expect(localDateKey(lateNight)).toBe('2026-06-14');
  });

  it('normalizes to midnight of the civil day in the app time zone', () => {
    const start = startOfLocalDay(lateNight);
    // Meia-noite de 14/jun em São Paulo (UTC-3) é 03:00Z.
    expect(start.toISOString()).toBe('2026-06-14T03:00:00.000Z');
    expect(localDateKey(start)).toBe('2026-06-14');
  });

  it('respects an explicit time zone override', () => {
    expect(localDateKey(lateNight, 'UTC')).toBe('2026-06-15');
    expect(localDateKey(lateNight, APP_TIME_ZONE)).toBe('2026-06-14');
  });

  // Regressão: `new Date('2026-06-08')` é meia-noite UTC, que em São Paulo ainda
  // é 07/jun. Sem tratar o formato date-only, todo dateKey que passava por aqui
  // voltava um dia e deslocava agendas, curvas de energia e o digest semanal.
  it('reads a YYYY-MM-DD key as a civil day in the app time zone', () => {
    const start = startOfLocalDay('2026-06-08');

    expect(localDateKey(start)).toBe('2026-06-08');
    expect(start.toISOString()).toBe('2026-06-08T03:00:00.000Z');
  });

  it('round-trips localDateKey through startOfLocalDay', () => {
    for (const iso of ['2026-01-01T02:00:00.000Z', '2026-06-15T02:30:58.997Z', '2026-10-18T04:00:00.000Z', '2026-12-31T23:59:59.000Z']) {
      const key = localDateKey(new Date(iso));
      expect(localDateKey(startOfLocalDay(key))).toBe(key);
    }
  });

  it('keeps date-only keys stable under a time zone override', () => {
    expect(startOfLocalDay('2026-06-08', 'UTC').toISOString()).toBe('2026-06-08T00:00:00.000Z');
    expect(localDateKey(startOfLocalDay('2026-06-08', 'UTC'), 'UTC')).toBe('2026-06-08');
  });
});
