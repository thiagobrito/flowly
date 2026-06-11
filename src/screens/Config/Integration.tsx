import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import { getHealthProvider } from '@/lib/energy';

import Card from './components/Card';
import SectionTitle from './components/SectionTitle';
import SettingsRow from './components/SettingsRow';
import SettingsToggle from './components/SettingsToggle';
import { useConfigPreferences } from './hooks/useConfigPreferences';

function healthLabel(): string {
  if (Platform.OS === 'ios') return 'Apple Health';
  if (Platform.OS === 'android') return 'Health Connect';
  return 'Saúde';
}

function healthDescription(): string {
  if (Platform.OS === 'ios') return 'Permita acesso aos dados de sono e atividade';
  if (Platform.OS === 'android') return 'Permita acesso aos dados de saúde do dispositivo';
  return 'Indisponível nesta plataforma';
}

export default function IntegrationSection({ isDark }: { isDark: boolean }) {
  const { preferences, setGoogleCalendarSync, setHealthEnabled } = useConfigPreferences();
  const [healthAvailable, setHealthAvailable] = useState(false);

  const handleGoogleCalendarToggle = useCallback(
    (enabled: boolean) => {
      setGoogleCalendarSync(enabled);
      if (enabled) {
        Alert.alert('Em desenvolvimento', 'A sincronização com Google Calendar estará disponível em breve.');
      }
    },
    [setGoogleCalendarSync],
  );
  const handleHealthToggle = useCallback(
    async (enabled: boolean) => {
      if (!healthAvailable) return;

      if (enabled) {
        try {
          await getHealthProvider().requestPermissions();
          setHealthEnabled(true);
        } catch {
          Alert.alert('Permissão negada', 'Não foi possível acessar os dados de saúde. Verifique as permissões nas configurações do dispositivo.');
          setHealthEnabled(false);
        }
        return;
      }

      Alert.alert(`Desativar ${healthLabel()}`, 'Para revogar o acesso aos dados de saúde, abra as configurações do dispositivo.', [
        { text: 'Cancelar', style: 'cancel', onPress: () => setHealthEnabled(true) },
        {
          text: 'Abrir Ajustes',
          onPress: () => {
            setHealthEnabled(false);
            Linking.openSettings();
          },
        },
      ]);
    },
    [healthAvailable, setHealthEnabled],
  );

  useEffect(() => {
    let active = true;
    getHealthProvider()
      .isAvailable()
      .then((available) => {
        if (active) setHealthAvailable(available);
      })
      .catch(() => {
        if (active) setHealthAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <SectionTitle isDark={isDark}>Integrações</SectionTitle>
      <Card isDark={isDark}>
        <SettingsRow
          label="Sincronizar com Google Calendar"
          description="Sincronize tarefas com seu calendário"
          isDark={isDark}
          trailing={<SettingsToggle value={Boolean(preferences.googleCalendarSync)} onValueChange={handleGoogleCalendarToggle} isDark={isDark} />}
        />
        <SettingsRow
          label={`Configurações do ${healthLabel()}`}
          description={healthDescription()}
          isDark={isDark}
          showDivider={false}
          trailing={<SettingsToggle value={Boolean(preferences.healthEnabled)} onValueChange={handleHealthToggle} disabled={!healthAvailable} isDark={isDark} />}
        />
      </Card>
    </>
  );
}
