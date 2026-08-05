import { insightsFingerprint, mergeAiSuggestions, toCandidates } from './aiSuggestions';
import type { CoachInsight } from './types';

const insight = (id: string, overrides: Partial<CoachInsight> = {}): CoachInsight => ({
  id,
  title: `Título de ${id}`,
  detail: `Detalhe de ${id}`,
  actionLabel: 'Aplicar',
  action: { type: 'schedule', taskId: id, startISO: '2026-08-04T09:00:00.000-03:00', durationMin: 60 },
  ...overrides,
});

const INSIGHTS = [insight('defer-1'), insight('valley-2', { action: { type: 'schedule', taskId: 'valley-2', startISO: '2026-08-04T14:30:00.000-03:00', durationMin: 45 } }), insight('unscheduled-3')];

describe('insightsFingerprint', () => {
  it('ignora a ordem da lista', () => {
    expect(insightsFingerprint([...INSIGHTS].reverse())).toBe(insightsFingerprint(INSIGHTS));
  });

  it('muda quando o horário sugerido muda', () => {
    const moved = INSIGHTS.map((item) => (item.id === 'valley-2' ? { ...item, action: { ...item.action!, startISO: '2026-08-04T16:00:00.000-03:00' } } : item));

    expect(insightsFingerprint(moved)).not.toBe(insightsFingerprint(INSIGHTS));
  });

  // O texto é justamente o que a LLM reescreve: incluí-lo na chave faria toda
  // mudança de copy das regras jogar o cache do dia fora.
  it('não muda quando só o texto muda', () => {
    expect(insightsFingerprint(INSIGHTS.map((item) => ({ ...item, title: 'outro', detail: 'outro' })))).toBe(insightsFingerprint(INSIGHTS));
  });

  it('distingue lista vazia de lista com item', () => {
    expect(insightsFingerprint([])).not.toBe(insightsFingerprint([INSIGHTS[0]!]));
  });
});

describe('toCandidates', () => {
  it('manda rótulo de hora legível, nunca o ISO', () => {
    const [first, second] = toCandidates(INSIGHTS);

    expect(first!.whenLabel).toBe('09:00');
    expect(second!.whenLabel).toBe('14:30');
    expect(JSON.stringify(toCandidates(INSIGHTS))).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('não inclui taskId: a LLM não precisa dele e não deve poder citá-lo', () => {
    expect(Object.keys(toCandidates(INSIGHTS)[0]!)).toEqual(['id', 'title', 'detail', 'whenLabel', 'durationMin']);
  });

  it('omite horário e duração quando o insight não tem ação', () => {
    const [candidate] = toCandidates([insight('informativo', { action: undefined })]);

    expect(candidate).toEqual({ id: 'informativo', title: 'Título de informativo', detail: 'Detalhe de informativo' });
  });

  it('corta em 8 candidatos, o teto aceito pelo backend', () => {
    const many = Array.from({ length: 12 }, (_, index) => insight(`c-${index}`));

    expect(toCandidates(many)).toHaveLength(8);
  });
});

describe('mergeAiSuggestions', () => {
  it('mantém a ação local, mesmo quando o texto vem da IA', () => {
    const [merged] = mergeAiSuggestions(INSIGHTS, [{ id: 'valley-2', title: 'Mova o estudo para as 14h30', detail: 'Sua energia é maior ali.' }]);

    expect(merged!.title).toBe('Mova o estudo para as 14h30');
    expect(merged!.action).toEqual(INSIGHTS[1]!.action);
    expect(merged!.actionLabel).toBe('Aplicar');
  });

  it('respeita a ordem escolhida pela IA', () => {
    const merged = mergeAiSuggestions(INSIGHTS, [
      { id: 'unscheduled-3', title: 'Terceira primeiro' },
      { id: 'defer-1', title: 'Primeira depois' },
    ]);

    expect(merged.map((item) => item.id)).toEqual(['unscheduled-3', 'defer-1']);
  });

  // Fronteira de confiança: um id inventado não tem ação validada contra a
  // agenda, então não pode virar um card com botão "Aplicar".
  it('descarta ids que não existem localmente', () => {
    const merged = mergeAiSuggestions(INSIGHTS, [
      { id: 'inventado', title: 'Medite três horas' },
      { id: 'defer-1', title: 'Válida' },
    ]);

    expect(merged.map((item) => item.id)).toEqual(['defer-1']);
  });

  it('descarta ids repetidos', () => {
    const merged = mergeAiSuggestions(INSIGHTS, [
      { id: 'defer-1', title: 'Primeira' },
      { id: 'defer-1', title: 'Repetida' },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.title).toBe('Primeira');
  });

  it('volta para o texto local quando a IA manda texto vazio', () => {
    const [merged] = mergeAiSuggestions(INSIGHTS, [{ id: 'defer-1', title: '   ', detail: '' }]);

    expect(merged!.title).toBe(INSIGHTS[0]!.title);
    expect(merged!.detail).toBe(INSIGHTS[0]!.detail);
  });

  it('devolve a lista determinística quando não há resposta da IA', () => {
    expect(mergeAiSuggestions(INSIGHTS, null)).toBe(INSIGHTS);
    expect(mergeAiSuggestions(INSIGHTS, [])).toBe(INSIGHTS);
  });

  it('devolve a lista determinística quando nenhum id da IA é válido', () => {
    expect(mergeAiSuggestions(INSIGHTS, [{ id: 'nada-a-ver', title: 'x' }])).toBe(INSIGHTS);
  });
});
