/**
 * # Camada de IA sobre as sugestões do coach (server-first)
 *
 * O servidor lista as tarefas pendentes, gera candidatas acionáveis e devolve
 * texto + `action`. O app só envia `dateKey` e contexto de energia, e mapeia a
 * resposta para a UI.
 *
 * O cache autoritativo vive no servidor (`userId + dateKey`, 24h). Aqui o
 * React Query usa a mesma janela para não refetchar à toa.
 */

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/network';
import { queryKeys } from '@/lib/query';

import type { CoachAction, CoachInsight } from './types';

/** Alinhado ao TTL de 24h do cache no servidor. */
const STALE_TIME_MS = 24 * 60 * 60 * 1000;

type ServerSuggestion = {
  id: string;
  title: string;
  detail?: string;
  action?: CoachAction;
  actionLabel?: string;
};

type CoachSuggestionsResponse = {
  suggestions?: ServerSuggestion[];
  source?: 'ai' | 'cache' | 'fallback';
  batchId?: string | null;
};

export type AiSuggestionsContext = {
  energyScore?: number;
  lastNightSleepHours?: number | null;
  peakLabel?: string;
};

export type AiCoachSuggestionsResult = {
  insights: CoachInsight[];
  isPending: boolean;
  isError: boolean;
  batchId: string | null;
};

/** Converte a resposta do servidor em insights da UI. */
export function mapServerSuggestions(suggestions: ServerSuggestion[] | null | undefined): CoachInsight[] {
  if (!suggestions || suggestions.length === 0) return [];

  const mapped: CoachInsight[] = [];
  for (const suggestion of suggestions) {
    const title = suggestion.title?.trim();
    const isDuplicate = mapped.some((insight) => insight.id === suggestion.id);
    if (title && !isDuplicate) {
      const detail = suggestion.detail?.trim();
      let actionLabel: string | undefined;
      if (suggestion.actionLabel) {
        actionLabel = suggestion.actionLabel;
      } else if (suggestion.action) {
        actionLabel = 'Aplicar';
      }

      mapped.push({
        id: suggestion.id,
        title,
        ...(detail ? { detail } : {}),
        ...(suggestion.action ? { action: suggestion.action } : {}),
        ...(actionLabel ? { actionLabel } : {}),
      });
    }
  }

  return mapped;
}

type FetchRankingResult = {
  suggestions: ServerSuggestion[];
  batchId: string | null;
};

async function fetchRanking(dateKey: string, context: AiSuggestionsContext): Promise<FetchRankingResult> {
  const response = await api.post<CoachSuggestionsResponse>('/ai/coach-suggestions', {
    dateKey,
    context,
  });

  return {
    suggestions: response?.suggestions ?? [],
    batchId: response?.batchId ?? null,
  };
}

/** Registra applied/dismissed no histórico do servidor (não bloqueia a UI). */
export function sendCoachSuggestionFeedback(params: { dateKey: string; suggestionId: string; status: 'applied' | 'dismissed'; batchId?: string | null }): void {
  const body: Record<string, string> = {
    dateKey: params.dateKey,
    suggestionId: params.suggestionId,
    status: params.status,
  };
  if (params.batchId) body.batchId = params.batchId;

  api.post('/ai/coach-suggestions/feedback', body).catch(() => undefined);
}

/**
 * Insights com texto/ordem/ação do servidor. Enquanto pendente ou em erro sem
 * dados, devolve lista vazia — a UI não inventa sugestões locais.
 */
export function useAiCoachSuggestions(dateKey: string, context: AiSuggestionsContext, enabled: boolean): AiCoachSuggestionsResult {
  const query = useQuery({
    queryKey: queryKeys.coachSuggestions(dateKey),
    queryFn: () => fetchRanking(dateKey, context),
    enabled,
    staleTime: STALE_TIME_MS,
    gcTime: STALE_TIME_MS,
    retry: 1,
  });

  return {
    insights: mapServerSuggestions(query.data?.suggestions),
    isPending: query.isPending,
    isError: query.isError,
    batchId: query.data?.batchId ?? null,
  };
}
