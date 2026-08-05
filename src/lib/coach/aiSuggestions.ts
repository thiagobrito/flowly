/**
 * # Camada de IA sobre as sugestões do coach
 *
 * As regras determinísticas continuam donas do que é **acionável**: o `action`
 * (taskId, horário, duração) sai daqui intacto, do jeito que `buildRecommendations`
 * produziu. A LLM no backend só escolhe até três dos candidatos e reescreve o
 * texto.
 *
 * Por isso a resposta do servidor é aplicada por `mergeAiSuggestions`, não
 * substituída: um id que o servidor não devolveu simplesmente não aparece, e um
 * id que ele inventasse não existiria no mapa e seria ignorado. Nenhum caminho
 * permite que a IA agende algo que as regras não validaram contra a agenda.
 *
 * O cache é o ponto central: a chave inclui a fingerprint dos candidatos, e o
 * `staleTime` é infinito. Enquanto a agenda não mudar, o texto não muda —
 * a queixa original era exatamente que ele mudava a cada abertura da tela.
 */

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/network';
import { queryKeys } from '@/lib/query';

import { formatHourLabel, minutesOfIso } from './schedule';
import type { CoachInsight } from './types';

/** Espelha `MAX_CANDIDATES` do backend. */
const MAX_CANDIDATES = 8;

type CoachCandidatePayload = {
  id: string;
  title: string;
  detail?: string;
  whenLabel?: string;
  durationMin?: number;
};

type RankedSuggestion = {
  id: string;
  title: string;
  detail?: string;
};

type CoachSuggestionsResponse = {
  suggestions?: RankedSuggestion[];
  source?: 'ai' | 'cache' | 'fallback';
};

export type AiSuggestionsContext = {
  energyScore?: number;
  lastNightSleepHours?: number | null;
  peakLabel?: string;
};

/**
 * Fingerprint das sugestões locais.
 *
 * Só id + horário + duração entram: o texto é justamente o que a LLM reescreve,
 * então incluí-lo geraria um miss de cache a cada mudança de copy das regras.
 */
export function insightsFingerprint(insights: CoachInsight[]): string {
  return [...insights]
    .map((insight) => `${insight.id}@${insight.action?.startISO ?? ''}+${insight.action?.durationMin ?? 0}`)
    .sort()
    .join(';');
}

/** Converte insights locais no payload do endpoint, sem vazar ISO de agendamento. */
export function toCandidates(insights: CoachInsight[]): CoachCandidatePayload[] {
  return insights.slice(0, MAX_CANDIDATES).map((insight) => {
    const startMinute = insight.action ? minutesOfIso(insight.action.startISO) : null;

    return {
      id: insight.id,
      title: insight.title,
      ...(insight.detail ? { detail: insight.detail } : {}),
      ...(startMinute != null ? { whenLabel: formatHourLabel(startMinute) } : {}),
      ...(insight.action ? { durationMin: insight.action.durationMin } : {}),
    };
  });
}

/**
 * Aplica o ranking do servidor sobre os insights locais.
 *
 * A ação vem sempre do insight local. O servidor só decide **quais** aparecem e
 * **com que texto** — ids desconhecidos são descartados aqui.
 */
export function mergeAiSuggestions(insights: CoachInsight[], ranked: RankedSuggestion[] | null | undefined): CoachInsight[] {
  if (!ranked || ranked.length === 0) return insights;

  const byId = new Map(insights.map((insight) => [insight.id, insight]));
  const merged: CoachInsight[] = [];

  for (const suggestion of ranked) {
    const local = byId.get(suggestion.id);
    if (local && !merged.some((insight) => insight.id === local.id)) {
      merged.push({
        ...local,
        title: suggestion.title?.trim() || local.title,
        detail: suggestion.detail?.trim() || local.detail,
      });
    }
  }

  // Servidor sem nenhum id válido: a lista determinística é melhor que uma tela vazia.
  return merged.length > 0 ? merged : insights;
}

async function fetchRanking(dateKey: string, insights: CoachInsight[], context: AiSuggestionsContext): Promise<RankedSuggestion[]> {
  const response = await api.post<CoachSuggestionsResponse>('/ai/coach-suggestions', {
    dateKey,
    candidates: toCandidates(insights),
    context,
  });

  return response?.suggestions ?? [];
}

/**
 * Insights com o texto e a ordem escolhidos pela IA quando disponível.
 *
 * Erro de rede não é tratado: `useQuery` guarda o erro, `data` fica indefinido e
 * `mergeAiSuggestions` devolve os insights determinísticos. A tela nunca fica
 * pior do que a versão sem IA.
 */
export function useAiCoachSuggestions(dateKey: string, insights: CoachInsight[], context: AiSuggestionsContext): CoachInsight[] {
  const fingerprint = insightsFingerprint(insights);

  const query = useQuery({
    queryKey: queryKeys.coachSuggestions(dateKey, fingerprint),
    queryFn: () => fetchRanking(dateKey, insights, context),
    enabled: insights.length > 0,
    // Uma chamada por combinação de candidatos, por dia. É o que faz a sugestão
    // parar de mudar entre renders.
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  return mergeAiSuggestions(insights, query.data);
}
