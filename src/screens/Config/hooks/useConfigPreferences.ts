import { useCallback } from 'react';

import { type PersistedRecord, usePersistedState } from '@/lib/storage';

export type ConfigPreferences = PersistedRecord & {
  googleCalendarSync: boolean;
  healthEnabled: boolean;
  taskRemindersEnabled: boolean;
  loaded?: boolean;
  lastUpdate?: string;
};

const CONFIG_KEY = 'config_preferences_v1';

const DEFAULT_PREFERENCES: ConfigPreferences = {
  googleCalendarSync: false,
  healthEnabled: false,
  taskRemindersEnabled: true,
};

export function useConfigPreferences() {
  const [preferences, setPreferences] = usePersistedState<ConfigPreferences>(DEFAULT_PREFERENCES, CONFIG_KEY);

  const setGoogleCalendarSync = useCallback(
    (enabled: boolean) => {
      setPreferences({ ...preferences, googleCalendarSync: enabled });
    },
    [preferences, setPreferences],
  );

  const setHealthEnabled = useCallback(
    (enabled: boolean) => {
      setPreferences({ ...preferences, healthEnabled: enabled });
    },
    [preferences, setPreferences],
  );

  const setTaskRemindersEnabled = useCallback(
    (enabled: boolean) => {
      setPreferences({ ...preferences, taskRemindersEnabled: enabled });
    },
    [preferences, setPreferences],
  );

  return {
    preferences,
    isHydrated: Boolean(preferences.loaded),
    setGoogleCalendarSync,
    setHealthEnabled,
    setTaskRemindersEnabled,
  };
}
