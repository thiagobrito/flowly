/**
 * # Preferência de tema
 *
 * `system` (padrão), `light` ou `dark`, persistida em AsyncStorage e aplicada no
 * NativeWind. O estado vive em módulo, não em contexto: `_layout` e a seção de
 * Aparência montam o hook em pontos distintos da árvore e precisam ver o mesmo
 * valor — um `useState` em cada um dessincronizaria a tela de config do resto do
 * app.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme_mode_v1';

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

let mode: ThemeMode = 'system';
let hydrationStarted = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(next: ThemeMode): void {
  mode = next;
  for (const listener of listeners) listener();
}

async function hydrate(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (isThemeMode(raw)) emit(raw);
  } catch {
    // Sem preferência salva: segue o sistema.
  }
}

/** Modo atual e setter. Aplica o modo no NativeWind sempre que ele muda. */
export function useThemePreference() {
  const { setColorScheme } = useColorScheme();
  const current = useSyncExternalStore(subscribe, () => mode);

  useEffect(() => {
    if (hydrationStarted) return;
    hydrationStarted = true;
    hydrate().catch(() => undefined);
  }, []);

  useEffect(() => {
    setColorScheme(current);
  }, [current, setColorScheme]);

  const setMode = useCallback((next: ThemeMode) => {
    emit(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  return { mode: current, setMode };
}
