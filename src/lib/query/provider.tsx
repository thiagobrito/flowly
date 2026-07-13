import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { queryClient } from './queryClient';

/**
 * Persiste o cache do React Query no AsyncStorage. Na próxima abertura do app,
 * o cache é reidratado e as telas renderizam os últimos dados conhecidos
 * instantaneamente, enquanto a revalidação acontece em background.
 */
const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'flowly_query_cache_v1',
  throttleTime: 1_000,
});

/**
 * Liga o `focusManager` do React Query ao ciclo de vida do app: ao voltar do
 * background, marca como "focado", disparando o revalidate das queries velhas.
 * Substitui os listeners manuais de `AppState` espalhados pelas telas.
 */
function useAppStateFocus() {
  useEffect(() => {
    // No mobile assumimos "online"; sem NetInfo, evitamos falsos negativos que
    // pausariam as queries indefinidamente.
    onlineManager.setOnline(true);

    const subscription = AppState.addEventListener('change', (status) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    });

    return () => subscription.remove();
  }, []);
}

export function QueryProvider({ children }: { children: ReactNode }) {
  useAppStateFocus();

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}>
      {children}
    </PersistQueryClientProvider>
  );
}
