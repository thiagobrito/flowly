import { useCallback } from 'react';

import { getPersistedSnapshot, type PersistedRecord, usePersistedState } from '@/lib/storage';

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
      const current = getPersistedSnapshot(DEFAULT_PREFERENCES, CONFIG_KEY);
      if (current.googleCalendarSync === enabled) return;
      setPreferences({ ...current, googleCalendarSync: enabled });
    },
    [setPreferences],
  );

  const setHealthEnabled = useCallback(
    (enabled: boolean) => {
      const current = getPersistedSnapshot(DEFAULT_PREFERENCES, CONFIG_KEY);
      if (current.healthEnabled === enabled) return;
      setPreferences({ ...current, healthEnabled: enabled });
    },
    [setPreferences],
  );

  const setTaskRemindersEnabled = useCallback(
    (enabled: boolean) => {
      const current = getPersistedSnapshot(DEFAULT_PREFERENCES, CONFIG_KEY);
      if (current.taskRemindersEnabled === enabled) return;
      setPreferences({ ...current, taskRemindersEnabled: enabled });
    },
    [setPreferences],
  );

  return {
    preferences,
    isHydrated: Boolean(preferences.loaded),
    setGoogleCalendarSync,
    setHealthEnabled,
    setTaskRemindersEnabled,
  };
}
