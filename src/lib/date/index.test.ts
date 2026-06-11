import { localDateKey, startOfLocalDay, toLocalISOString } from './index';

describe('date helpers', () => {
  const device = new Date('2026-06-10T22:39:58.997');

  it('formats local ISO with timezone offset', () => {
    const iso = toLocalISOString(device);
    expect(iso.startsWith('2026-06-10T22:39:58.997')).toBe(true);
    expect(iso).toMatch(/[+-]\d{2}:\d{2}$/);
    expect(iso.endsWith('Z')).toBe(false);
  });

  it('builds a local date key', () => {
    expect(localDateKey(device)).toBe('2026-06-10');
  });

  it('normalizes to local midnight', () => {
    const start = startOfLocalDay(device);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(5);
    expect(start.getDate()).toBe(10);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });
});
