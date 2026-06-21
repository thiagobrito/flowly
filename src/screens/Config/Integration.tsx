import { RefreshCw } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform } from 'react-native';

import { getHealthProvider } from '@/lib/energy';
import { hasGoogleClientIds, type SyncResult, useGoogleCalendarSync } from '@/lib/googleCalendar';

import Card from './components/Card';
import SectionTitle from './components/SectionTitle';
import SettingsRow from './components/SettingsRow';
import SettingsToggle from './components/SettingsToggle';
import { useConfigPreferences } from './hooks/useConfigPreferences';

function syncSummary(result: SyncResult): string {
  const parts = [`${result.created} tarefa(s) criada(s)`];
  if (result.skipped > 0) parts.push(`${result.skipped} ignorada(s)`);
  if (result.failed > 0) parts.push(`${result.failed} com falha`);
  return `${parts.join(', ')}.`;
}

function googleStatusDescription(isConnected: boolean, lastSyncAt: string | null): string {
  if (!isConnected) return 'Importe seus eventos como tarefas';
  if (lastSyncAt) return `Conectado · última sincronização ${new Date(lastSyncAt).toLocaleString('pt-BR')}`;
  return 'Conectado';
}

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

  const googleConfigured = hasGoogleClientIds();
  const { isConnected, isReady, pending, lastSyncAt, connect, syncNow, disconnect } = useGoogleCalendarSync({
    onSynced: (result) => Alert.alert('Sincronização concluída', syncSummary(result)),
    onError: () => Alert.alert('Erro na sincronização', 'Não foi possível importar os eventos do Google Calendar. Tente novamente.'),
  });

  useEffect(() => {
    if (preferences.googleCalendarSync === isConnected) return;
    setGoogleCalendarSync(isConnected);
  }, [isConnected, preferences.googleCalendarSync, setGoogleCalendarSync]);

  const handleGoogleCalendarToggle = useCallback(
    async (enabled: boolean) => {
      if (!googleConfigured) {
        Alert.alert('Configuração necessária', 'Defina as credenciais do Google (EXPO_PUBLIC_GOOGLE_*) no .env. Veja o README do projeto.');
        return;
      }

      if (enabled) {
        try {
          await connect();
        } catch {
          Alert.alert('Não foi possível conectar', 'O login com o Google foi cancelado ou falhou.');
        }
        return;
      }

      disconnect();
    },
    [googleConfigured, connect, disconnect],
  );

  const googleDescription = googleStatusDescription(isConnected, lastSyncAt);

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
          description={googleDescription}
          isDark={isDark}
          trailing={pending && !isConnected ? <ActivityIndicator color={isDark ? '#e4e4e7' : '#3b82f6'} /> : <SettingsToggle value={isConnected} onValueChange={handleGoogleCalendarToggle} disabled={!isReady || pending} isDark={isDark} />}
        />
        {isConnected ? (
          <SettingsRow
            label="Sincronizar agora"
            description="Importar novos eventos do calendário"
            isDark={isDark}
            onPress={pending ? undefined : () => syncNow()}
            trailing={pending ? <ActivityIndicator color={isDark ? '#e4e4e7' : '#3b82f6'} /> : <RefreshCw size={20} color={isDark ? '#a1a1aa' : '#71717a'} />}
          />
        ) : null}
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
