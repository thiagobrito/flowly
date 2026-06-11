const pad = (value: number, length = 2): string => String(value).padStart(length, '0');

/** Retorna a data/hora local do dispositivo em ISO 8601 com offset de fuso. */
export function toLocalISOString(date = new Date()): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** Retorna `YYYY-MM-DD` no fuso horário local do dispositivo. */
export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Normaliza uma data ou ISO para meia-noite local do mesmo dia civil. */
export function startOfLocalDay(value: string | Date): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  date.setHours(0, 0, 0, 0);
  return date;
}
