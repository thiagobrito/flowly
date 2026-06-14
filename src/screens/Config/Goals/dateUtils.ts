const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;

export const formatDate = (isoDate: string) => {
  const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number);
  return `${String(day).padStart(2, '0')} ${MONTHS_SHORT[month - 1] ?? ''} ${year}`;
};

export const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseIsoDate = (isoDate: string | null) => {
  if (!isoDate) return new Date();
  const [year = 0, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const addWeeks = (isoDate: string, weeks: number) => {
  const date = parseIsoDate(isoDate);
  date.setDate(date.getDate() + weeks * 7);
  return toIsoDate(date);
};
