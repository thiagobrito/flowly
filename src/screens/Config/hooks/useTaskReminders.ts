import { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';

import { ensurePermissions, getPermissionStatus } from '@/lib/notifications';
import { cancelTaskReminders, syncTaskReminders } from '@/lib/taskReminders';

import { useConfigPreferences } from './useConfigPreferences';

/**
 * Orquestra os lembretes de início de tarefa: lê a preferência persistida,
 * sincroniza as notificações no boot e ao voltar para o app, e expõe um
 * `toggle` que cuida da permissão.
 */
export function useTaskReminders() {
  const { preferences, isHydrated, setTaskRemindersEnabled } = useConfigPreferences();
  const enabled = preferences.taskRemindersEnabled ?? true;

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!isHydrated) return undefined;

    const run = async () => {
      if (enabled) {
        const status = await getPermissionStatus();
        if (status === 'undetermined') {
          await ensurePermissions();
        }
      }
      await syncTaskReminders({ enabled });
    };

    run();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        syncTaskReminders({ enabled });
      }
      appState.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [enabled, isHydrated]);

  const toggle = useCallback(
    async (next: boolean) => {
      if (next) {
        const status = await ensurePermissions();
        if (status !== 'granted') {
          Alert.alert('Permissão necessária', 'Para receber lembretes, permita as notificações nas configurações do dispositivo.');
          setTaskRemindersEnabled(false);
          await cancelTaskReminders();
          return;
        }
        setTaskRemindersEnabled(true);
        await syncTaskReminders({ enabled: true });
        return;
      }

      setTaskRemindersEnabled(false);
      await cancelTaskReminders();
    },
    [setTaskRemindersEnabled],
  );

  return { enabled, isHydrated, toggle };
}
