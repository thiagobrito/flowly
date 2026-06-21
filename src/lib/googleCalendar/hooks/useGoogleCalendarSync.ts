/**
 * Orquestra conexão + importação de eventos do Google Calendar como tarefas.
 *
 * Combina `useGoogleAuth` (OAuth + tokens) com o `syncEventsToTasks` e a
 * persistência do mapa de dedupe (`eventId -> taskId`). Pensado para ser
 * consumido pela tela de Configurações.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { usePersistedState } from '@/lib/storage';

import { useGoogleAuth } from '../auth';
import { GOOGLE_SYNC_MAP_KEY } from '../config';
import { syncEventsToTasks } from '../sync';
import type { SyncMap, SyncResult } from '../types';

const EMPTY_MAP: SyncMap = { entries: {}, lastSyncAt: null };

export type UseGoogleCalendarSyncOptions = {
  /** Chamado após cada importação bem-sucedida (para feedback na UI). */
  onSynced?: (result: SyncResult) => void;
  /** Chamado quando a importação falha (ex.: token inválido/sem rede). */
  onError?: (error: unknown) => void;
};

export type UseGoogleCalendarSyncResult = {
  isConnected: boolean;
  isReady: boolean;
  /** Uma operação (conexão ou sync) está em andamento. */
  pending: boolean;
  lastSyncAt: string | null;
  /** Conecta a conta Google e, ao concluir, importa os eventos. */
  connect: () => Promise<void>;
  /** Reexecuta a importação (requer conta já conectada). */
  syncNow: () => Promise<SyncResult | null>;
  /** Desconecta a conta (limpa tokens). */
  disconnect: () => void;
};

export function useGoogleCalendarSync(options: UseGoogleCalendarSyncOptions = {}): UseGoogleCalendarSyncResult {
  const { tokens, isConnected, isReady, connect: connectAuth, disconnect } = useGoogleAuth();
  const [map, setMap] = usePersistedState<SyncMap>(EMPTY_MAP, GOOGLE_SYNC_MAP_KEY);
  const [pending, setPending] = useState(false);

  // Mantém uma referência sempre atualizada do mapa para o sync fora do render.
  const mapRef = useRef(map);
  mapRef.current = map;

  // Callbacks via ref para não recriar `syncNow` a cada render.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const syncNow = useCallback(async (): Promise<SyncResult | null> => {
    const token = tokens.accessToken;
    if (!token) return null;

    setPending(true);
    try {
      const result = await syncEventsToTasks({ token, existingMap: mapRef.current.entries ?? {} });
      setMap({ entries: result.map, lastSyncAt: new Date().toISOString() });
      optionsRef.current.onSynced?.(result);
      return result;
    } catch (error) {
      optionsRef.current.onError?.(error);
      return null;
    } finally {
      setPending(false);
    }
  }, [tokens.accessToken, setMap]);

  // Dispara a importação automaticamente assim que a conexão é concluída.
  const wantsSyncAfterConnect = useRef(false);
  useEffect(() => {
    if (isConnected && wantsSyncAfterConnect.current) {
      wantsSyncAfterConnect.current = false;
      syncNow().catch(() => undefined);
    }
  }, [isConnected, syncNow]);

  const connect = useCallback(async () => {
    wantsSyncAfterConnect.current = true;
    setPending(true);
    try {
      await connectAuth();
    } finally {
      // O sync é disparado pelo efeito acima quando `isConnected` virar true.
      setPending(false);
    }
  }, [connectAuth]);

  return {
    isConnected,
    isReady,
    pending,
    lastSyncAt: map.lastSyncAt ?? null,
    connect,
    syncNow,
    disconnect,
  };
}
