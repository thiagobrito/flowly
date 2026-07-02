import { matchArea, matchIntent, normalizeSpeech, parseFrequency, parseSpokenTime } from './parse';

// 2 de julho de 2026, 15:00 em São Paulo (quinta-feira).
const NOW = new Date('2026-07-02T18:00:00Z');

describe('normalizeSpeech', () => {
  it('removes accents, case and hyphens', () => {
    expect(normalizeSpeech('  Toda Segunda-Feira às 9h  ')).toBe('toda segunda feira as 9h');
  });
});

describe('matchIntent', () => {
  it.each(['Criar tarefa', 'quero criar uma tarefa', 'criar uma nova atividade', 'nova tarefa', 'adicionar tarefa'])('recognizes "%s" as create-task', (phrase) => {
    expect(matchIntent(phrase)).toBe('create-task');
  });

  it('returns null for unrelated speech', () => {
    expect(matchIntent('abrir o calendário')).toBeNull();
    expect(matchIntent('')).toBeNull();
  });
});

describe('parseSpokenTime', () => {
  it.each([
    ['às 2 da tarde', '14:00'],
    ['hoje às 14h30', '14:30'],
    ['às 9 e meia', '09:30'],
    ['9 e meia da noite', '21:30'],
    ['meio dia', '12:00'],
    ['meio dia e meia', '12:30'],
    ['meia noite', '00:00'],
    ['às 14:15', '14:15'],
    ['duas horas da tarde', '14:00'],
    ['de manhã', '09:00'],
    ['à noite', '20:00'],
  ])('parses "%s" as %s', (phrase, expected) => {
    expect(parseSpokenTime(phrase)).toBe(expected);
  });

  it('does not treat bare numbers as time', () => {
    expect(parseSpokenTime('dia 15')).toBeNull();
    expect(parseSpokenTime('15 de julho')).toBeNull();
  });
});

describe('parseFrequency', () => {
  it('parses "no date" answers', () => {
    expect(parseFrequency('sem data definida', NOW)).toEqual({ kind: 'notime' });
    expect(parseFrequency('qualquer hora', NOW)).toEqual({ kind: 'notime' });
    expect(parseFrequency('quando der', NOW)).toEqual({ kind: 'notime' });
  });

  it('parses "hoje às 2 da tarde"', () => {
    expect(parseFrequency('hoje às 2 da tarde', NOW)).toEqual({ kind: 'once', date: '2026-07-02', time: '14:00' });
  });

  it('parses "amanhã de manhã"', () => {
    expect(parseFrequency('amanhã de manhã', NOW)).toEqual({ kind: 'once', date: '2026-07-03', time: '09:00' });
  });

  it('parses "depois de amanhã"', () => {
    expect(parseFrequency('depois de amanhã', NOW)).toEqual({ kind: 'once', date: '2026-07-04', time: null });
  });

  it('parses "dia 15" as the next 15th', () => {
    expect(parseFrequency('dia 15', NOW)).toEqual({ kind: 'once', date: '2026-07-15', time: null });
  });

  it('rolls "dia 1" into the next month when it already passed', () => {
    expect(parseFrequency('dia 1', NOW)).toEqual({ kind: 'once', date: '2026-08-01', time: null });
  });

  it('parses "15 de julho às 9h"', () => {
    expect(parseFrequency('15 de julho às 9h', NOW)).toEqual({ kind: 'once', date: '2026-07-15', time: '09:00' });
  });

  it('rolls a passed day/month into next year', () => {
    expect(parseFrequency('10 de janeiro', NOW)).toEqual({ kind: 'once', date: '2027-01-10', time: null });
  });

  it('parses "toda segunda-feira" as recurring weekday', () => {
    expect(parseFrequency('toda segunda-feira', NOW)).toEqual({ kind: 'daily', everyDay: false, days: [1] });
  });

  it('parses "toda segunda e quarta" as recurring weekdays', () => {
    expect(parseFrequency('toda segunda e quarta', NOW)).toEqual({ kind: 'daily', everyDay: false, days: [1, 3] });
  });

  it('parses "todo dia"', () => {
    expect(parseFrequency('todo dia', NOW)).toEqual({ kind: 'daily', everyDay: true, days: [] });
  });

  it('parses weekly counts', () => {
    expect(parseFrequency('3 vezes por semana', NOW)).toEqual({ kind: 'weekly', mode: 'count', count: 3, days: [] });
    expect(parseFrequency('duas vezes por semana', NOW)).toEqual({ kind: 'weekly', mode: 'count', count: 2, days: [] });
  });

  it('parses intervals', () => {
    expect(parseFrequency('a cada 3 dias', NOW)).toEqual({ kind: 'interval', everyNDays: 3 });
    expect(parseFrequency('dia sim dia não', NOW)).toEqual({ kind: 'interval', everyNDays: 2 });
  });

  it('parses a single weekday as the next occurrence', () => {
    // NOW é quinta (2026-07-02); próxima segunda é 2026-07-06.
    expect(parseFrequency('na segunda às 10', NOW)).toEqual({ kind: 'once', date: '2026-07-06', time: '10:00' });
  });

  it('parses a bare time as today', () => {
    expect(parseFrequency('às 15 horas', NOW)).toEqual({ kind: 'once', date: '2026-07-02', time: '15:00' });
  });

  it('returns null when nothing is recognized', () => {
    expect(parseFrequency('vou pensar depois', NOW)).toBeNull();
    expect(parseFrequency('', NOW)).toBeNull();
  });
});

describe('matchArea', () => {
  it('matches life areas by label', () => {
    expect(matchArea('Saúde')).toEqual({ value: 'health', label: 'Saúde' });
    expect(matchArea('acho que é trabalho')).toEqual({ value: 'work', label: 'Trabalho' });
  });

  it('matches spoken synonyms', () => {
    expect(matchArea('dinheiro')).toEqual({ value: 'finance', label: 'Financeiro' });
    expect(matchArea('estudo')).toEqual({ value: 'studies', label: 'Estudos' });
  });

  it('prioritizes goal labels over life areas', () => {
    expect(matchArea('flowly', ['FLOWLY'])).toEqual({ value: 'FLOWLY', label: 'FLOWLY' });
  });

  it('returns null when nothing matches', () => {
    expect(matchArea('nenhuma dessas')).toBeNull();
    expect(matchArea('')).toBeNull();
  });
});
