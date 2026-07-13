import { QueryClient } from '@tanstack/react-query';

/**
 * Cliente único do React Query compartilhado por todo o app.
 *
 * Estratégia de percepção instantânea:
 * - `staleTime` de 30s: ao voltar para uma tela já visitada, os dados do cache
 *   aparecem imediatamente (0ms) e só há refetch em background se estiverem
 *   velhos. É o que troca o spinner por conteúdo já pronto.
 * - `gcTime` de 24h: mantém os dados em memória/persistência por bastante tempo
 *   para reidratar rápido entre sessões.
 * - `retry` 1 com backoff curto: resiliência sem travar a UI.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5_000),
      refetchOnReconnect: true,
      // O foco é controlado manualmente via AppState (ver provider); no mobile
      // não existe "window focus" como na web.
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
