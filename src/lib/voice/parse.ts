/**
 * # Voice — parser pt-BR
 *
 * Funções puras que transformam a fala transcrita do usuário nos dados da
 * tarefa: intenção ("criar tarefa"), data/frequência (`FrequencyConfig`) e
 * área (área da vida ou meta). É a primeira camada do modo híbrido — quando
 * o parser local não entende, o assistente recorre ao fallback LLM.
 */
import { localDateKey } from '@/lib/date';
import { LIFE_AREAS } from '@/screens/common';
import type { FrequencyConfig } from '@/screens/NewTask/data';

/** Remove acentos, baixa a caixa e normaliza espaços/hífens. */
export function normalizeSpeech(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Intenção
// ---------------------------------------------------------------------------

export type VoiceIntent = 'create-task';

const CREATE_TASK_PATTERNS = [/\bcriar (?:uma )?(?:nova )?(?:tarefa|atividade)\b/, /\bnova (?:tarefa|atividade)\b/, /\bcria (?:uma )?(?:tarefa|atividade)\b/, /\badicionar (?:uma )?(?:tarefa|atividade)\b/];

export function matchIntent(transcript: string): VoiceIntent | null {
  const text = normalizeSpeech(transcript);
  if (CREATE_TASK_PATTERNS.some((pattern) => pattern.test(text))) return 'create-task';
  return null;
}

// ---------------------------------------------------------------------------
// Números e dias da semana falados
// ---------------------------------------------------------------------------

const NUMBER_WORDS: Record<string, number> = {
  um: 1,
  uma: 1,
  duas: 2,
  dois: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
};

function wordToNumber(word: string): number | null {
  if (/^\d+$/.test(word)) return Number(word);
  return NUMBER_WORDS[word] ?? null;
}

/** Índices compatíveis com WEEKDAYS do NewTask: 0=Dom … 6=Sáb. */
const WEEKDAY_WORDS: Array<{ pattern: RegExp; index: number }> = [
  { pattern: /\bdomingos?\b/, index: 0 },
  { pattern: /\bsegundas?( feiras?)?\b/, index: 1 },
  { pattern: /\btercas?( feiras?)?\b/, index: 2 },
  { pattern: /\bquartas?( feiras?)?\b/, index: 3 },
  { pattern: /\bquintas?( feiras?)?\b/, index: 4 },
  { pattern: /\bsextas?( feiras?)?\b/, index: 5 },
  { pattern: /\bsabados?\b/, index: 6 },
];

function findWeekdays(text: string): number[] {
  return WEEKDAY_WORDS.filter(({ pattern }) => pattern.test(text)).map(({ index }) => index);
}

// ---------------------------------------------------------------------------
// Horário
// ---------------------------------------------------------------------------

const pad2 = (value: number): string => String(value).padStart(2, '0');

const NUMBER_WORD_PATTERN = 'uma|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze';

/**
 * Extrai um horário falado como `HH:mm`. Exige um marcador claro de horário
 * ("às 9", "14h30", "2 horas", "9:15") para não confundir números soltos
 * (ex.: "dia 15") com horas. Períodos do dia sem hora explícita viram um
 * horário padrão (manhã 09:00, tarde 15:00, noite 20:00).
 */
export function parseSpokenTime(transcript: string): string | null {
  const text = normalizeSpeech(transcript);

  if (/\bmeio dia\b/.test(text)) {
    return /\bmeio dia e meia\b/.test(text) ? '12:30' : '12:00';
  }
  if (/\bmeia noite\b/.test(text)) return '00:00';

  const candidates = [
    // "às 2", "as 9 e meia", "às 14:30", "às 14h30", "para as 10 horas"
    new RegExp(`\\b(?:as|pelas|para as?)\\s+(\\d{1,2}|${NUMBER_WORD_PATTERN})(?::(\\d{2})|h(\\d{2})| e (meia|\\d{1,2}))?(?:\\s*(?:horas?|h))?\\b`),
    // "14h", "14h30", "9h e meia"
    /\b(\d{1,2})h(\d{2})?(?: e (meia))?\b/,
    // "2 horas", "duas horas e meia"
    new RegExp(`\\b(\\d{1,2}|${NUMBER_WORD_PATTERN})\\s*horas?(?: e (?:(meia)|(\\d{1,2})))?\\b`),
    // "14:30"
    /\b(\d{1,2}):(\d{2})\b/,
    // "9 e meia" — "e meia" já marca contexto de horário
    new RegExp(`\\b(\\d{1,2}|${NUMBER_WORD_PATTERN}) e (meia)\\b`),
  ];

  let hour: number | null = null;
  let minute = 0;

  for (const pattern of candidates) {
    const match = text.match(pattern);
    const parsedHour = match ? wordToNumber(match[1] ?? '') : null;

    if (match && parsedHour !== null && parsedHour <= 23) {
      hour = parsedHour;
      const minutePart = match.slice(2).find((part) => part !== undefined);
      if (minutePart === 'meia') minute = 30;
      else if (minutePart) minute = Number(minutePart);
      break;
    }
  }

  const afternoon = /\b(da|de|a) tarde\b/.test(text);
  const night = /\b(da|de|a|pela) noite\b/.test(text);
  const morning = /\b(de|da|pela) manha\b/.test(text);

  if (hour === null) {
    // Período do dia sem hora explícita
    if (morning) return '09:00';
    if (afternoon) return '15:00';
    if (night) return '20:00';
    return null;
  }

  if (minute > 59) return null;

  // "2 da tarde" → 14h, "9 da noite" → 21h
  if ((afternoon || night) && hour < 12) hour += 12;

  return `${pad2(hour)}:${pad2(minute)}`;
}

// ---------------------------------------------------------------------------
// Data / frequência
// ---------------------------------------------------------------------------

const MONTH_WORDS: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

/** Soma dias a uma chave `YYYY-MM-DD` (calendário civil, sem fuso). */
function addDaysToKey(dateKey: string, days: number): string {
  const [year = 1970, month = 1, day = 1] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/** Dia da semana (0=Dom) de uma chave `YYYY-MM-DD`. */
function weekdayOfKey(dateKey: string): number {
  const [year = 1970, month = 1, day = 1] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

/**
 * Interpreta a resposta de "Quando a tarefa será feita?" como um
 * `FrequencyConfig`. Retorna `null` quando não reconhece o formato.
 */
export function parseFrequency(transcript: string, now: Date = new Date()): FrequencyConfig | null {
  const text = normalizeSpeech(transcript);
  if (!text) return null;

  const todayKey = localDateKey(now);

  // 1. Sem data definida
  if (/\bsem (data|hora|horario)( definid[ao])?\b/.test(text) || /\bqualquer (hora|dia|momento)\b/.test(text) || /\bquando (der|puder|sobrar tempo)\b/.test(text) || /\bnenhuma data\b/.test(text)) {
    return { kind: 'notime' };
  }

  // 2. Intervalo: "a cada 3 dias", "dia sim dia não"
  if (/\bdia sim,? dia nao\b/.test(text)) {
    return { kind: 'interval', everyNDays: 2 };
  }
  const intervalMatch = text.match(/\ba cada (\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez) dias?\b/);
  if (intervalMatch) {
    const n = wordToNumber(intervalMatch[1] ?? '');
    if (n !== null && n >= 1) return n === 1 ? { kind: 'daily', everyDay: true, days: [] } : { kind: 'interval', everyNDays: n };
  }

  // 3. Semanal por contagem: "3 vezes por semana", "uma vez na semana"
  const weeklyMatch = text.match(/\b(\d+|uma|duas|tres|quatro|cinco|seis|sete)\s*(?:x|vez(?:es)?)\s*(?:por|na|a cada)\s*semana\b/);
  if (weeklyMatch) {
    const count = wordToNumber(weeklyMatch[1] ?? '');
    if (count !== null && count >= 1) return { kind: 'weekly', mode: 'count', count, days: [] };
  }

  // 4. Diária: "todo dia", "todos os dias", "diariamente"
  if (/\btodo (o )?dia\b/.test(text) || /\btodos os dias\b/.test(text) || /\bdiariamente\b/.test(text)) {
    return { kind: 'daily', everyDay: true, days: [] };
  }

  const weekdays = findWeekdays(text);
  const hasRecurrenceMarker = /\btoda(s)?\b/.test(text) || /\bcada\b/.test(text) || /\bsempre\b/.test(text) || /\bas segundas|as tercas|as quartas|as quintas|as sextas|aos sabados|aos domingos\b/.test(text);

  // 5. Dias da semana recorrentes: "toda segunda", "segunda e quarta, sempre"
  if (weekdays.length > 0 && hasRecurrenceMarker) {
    return { kind: 'daily', everyDay: false, days: weekdays };
  }

  const time = parseSpokenTime(text);

  // 6. Data pontual
  if (/\bdepois de amanha\b/.test(text)) {
    return { kind: 'once', date: addDaysToKey(todayKey, 2), time };
  }
  if (/\bamanha\b/.test(text)) {
    return { kind: 'once', date: addDaysToKey(todayKey, 1), time };
  }
  if (/\bhoje\b/.test(text)) {
    return { kind: 'once', date: todayKey, time };
  }

  // "15 de julho" (com "dia" opcional)
  const dayMonthMatch = text.match(/\b(?:dia )?(\d{1,2}) de (janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/);
  if (dayMonthMatch) {
    const day = Number(dayMonthMatch[1]);
    const month = MONTH_WORDS[dayMonthMatch[2] ?? ''] ?? 0;
    if (day >= 1 && day <= 31 && month >= 1) {
      const [currentYear = 1970] = todayKey.split('-').map(Number);
      let candidate = `${currentYear}-${pad2(month)}-${pad2(day)}`;
      if (candidate < todayKey) candidate = `${currentYear + 1}-${pad2(month)}-${pad2(day)}`;
      return { kind: 'once', date: candidate, time };
    }
  }

  // "dia 15" — próximo dia 15 (mês atual ou seguinte)
  const dayOnlyMatch = text.match(/\bdia (\d{1,2})\b/);
  if (dayOnlyMatch) {
    const day = Number(dayOnlyMatch[1]);
    if (day >= 1 && day <= 31) {
      const [year = 1970, month = 1] = todayKey.split('-').map(Number);
      let candidate = `${year}-${pad2(month)}-${pad2(day)}`;
      if (candidate < todayKey) {
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        candidate = `${nextYear}-${pad2(nextMonth)}-${pad2(day)}`;
      }
      return { kind: 'once', date: candidate, time };
    }
  }

  // Dia da semana sem recorrência: "na segunda às 10" → próxima ocorrência
  if (weekdays.length === 1 && weekdays[0] !== undefined) {
    const target = weekdays[0];
    const todayWeekday = weekdayOfKey(todayKey);
    const delta = (target - todayWeekday + 7) % 7 || 7;
    return { kind: 'once', date: addDaysToKey(todayKey, delta), time };
  }

  // Só um horário ("às 15h") → hoje nesse horário
  if (time) {
    return { kind: 'once', date: todayKey, time };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Área
// ---------------------------------------------------------------------------

export type ParsedArea = {
  /** Valor a salvar no campo `area` da tarefa (id de área da vida ou label da meta). */
  value: string;
  /** Rótulo exibível ao usuário. */
  label: string;
};

/** Sinônimos falados → id de área da vida. */
const AREA_SYNONYMS: Record<string, string> = {
  saude: 'health',
  financeiro: 'finance',
  financas: 'finance',
  dinheiro: 'finance',
  trabalho: 'work',
  relacionamento: 'relationships',
  relacionamentos: 'relationships',
  estudo: 'studies',
  estudos: 'studies',
  lazer: 'leisure',
  casa: 'home',
  espiritualidade: 'spirituality',
  outro: 'other',
  outros: 'other',
  meta: 'goal',
  metas: 'goal',
};

/**
 * Identifica a área falada entre as metas do usuário (`goalLabels`) e as
 * áreas da vida fixas. Metas têm prioridade por serem mais específicas.
 */
export function matchArea(transcript: string, goalLabels: string[] = []): ParsedArea | null {
  const text = normalizeSpeech(transcript);
  if (!text) return null;

  for (const label of goalLabels) {
    const normalized = normalizeSpeech(label);
    if (normalized && (text === normalized || text.includes(normalized) || normalized.includes(text))) {
      return { value: label, label };
    }
  }

  for (const area of LIFE_AREAS) {
    const normalized = normalizeSpeech(area.label);
    if (text === normalized || text.includes(normalized)) {
      return { value: area.id, label: area.label };
    }
  }

  for (const [word, id] of Object.entries(AREA_SYNONYMS)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) {
      const area = LIFE_AREAS.find((item) => item.id === id);
      if (area) return { value: area.id, label: area.label };
    }
  }

  return null;
}
