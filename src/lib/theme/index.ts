import { colorScheme } from 'nativewind';
import { useCallback, useEffect } from 'react';

import { getPersistedSnapshot, type PersistedRecord, usePersistedState } from '@/lib/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

export type ThemePreferences = PersistedRecord & {
  mode: ThemeMode;
  loaded?: boolean;
  lastUpdate?: string;
};

const THEME_KEY = 'theme_preferences_v1';

const DEFAULT_PREFERENCES: ThemePreferences = {
  mode: 'system',
};

/**
 * Preferência de tema (Sistema/Claro/Escuro) persistida. Aplica a escolha
 * globalmente via `colorScheme.set`, que por baixo chama
 * `Appearance.setColorScheme` — propagando tanto para as classes `dark:` do
 * NativeWind quanto para os `useColorScheme()` do react-native usados nas telas.
 */
export function useThemePreference() {
  const [preferences, setPreferences] = usePersistedState<ThemePreferences>(DEFAULT_PREFERENCES, THEME_KEY);
  const isHydrated = Boolean(preferences.loaded);

  useEffect(() => {
    if (isHydrated) {
      colorScheme.set(preferences.mode);
    }
  }, [isHydrated, preferences.mode]);

  const setMode = useCallback(
    (mode: ThemeMode) => {
      colorScheme.set(mode);
      const current = getPersistedSnapshot(DEFAULT_PREFERENCES, THEME_KEY);
      if (current.mode === mode) return;
      setPreferences({ ...current, mode });
    },
    [setPreferences],
  );

  return {
    mode: preferences.mode,
    isHydrated,
    setMode,
  };
}
