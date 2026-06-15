/**
 * Fuso horário oficial do app. Todas as datas civis (dia/mês/ano) são
 * resolvidas neste fuso, independente da configuração do dispositivo —
 * isso evita que um aparelho com fuso errado (ex.: UTC) registre o dia
 * seguinte perto da meia-noite.
 */
export const APP_TIME_ZONE = 'America/Sao_Paulo';

const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  offsetMinutes: number;
};

/** Extrai as partes de uma data no fuso informado, com offset em minutos. */
function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hour = Number(map.hour);
  const minute = Number(map.minute);
  const second = Number(map.second);
  const millisecond = date.getUTCMilliseconds();

  // O offset é a diferença entre o "relógio de parede" no fuso (tratado como
  // se fosse UTC) e o instante real em UTC.
  const asUTC = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const offsetMinutes = Math.round((asUTC - date.getTime()) / 60_000);

  return { year, month, day, hour, minute, second, millisecond, offsetMinutes };
}

/** Retorna a data/hora em ISO 8601 com offset de fuso, no fuso do app. */
export function toLocalISOString(date = new Date(), timeZone = APP_TIME_ZONE): string {
  const { year, month, day, hour, minute, second, millisecond, offsetMinutes } = getZonedParts(date, timeZone);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);

  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}.${pad(millisecond, 3)}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Retorna `YYYY-MM-DD` no fuso horário do app. */
export function localDateKey(date = new Date(), timeZone = APP_TIME_ZONE): string {
  const { year, month, day } = getZonedParts(date, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Normaliza uma data ou ISO para meia-noite do mesmo dia civil no fuso do app. */
export function startOfLocalDay(value: string | Date, timeZone = APP_TIME_ZONE): Date {
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;

  const { year, month, day } = getZonedParts(base, timeZone);

  // Meia-noite no relógio de parede do fuso, convertida para o instante UTC real.
  const wallClockAsUTC = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const { offsetMinutes } = getZonedParts(new Date(wallClockAsUTC), timeZone);

  return new Date(wallClockAsUTC - offsetMinutes * 60_000);
}
