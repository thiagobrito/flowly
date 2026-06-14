import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';

import { useSession } from '@/lib/auth';
import { api } from '@/lib/network';

import AccountSection from './Account';
import ConfigHeader from './components/ConfigHeader';
import Goals from './Goals';
import IntegrationSection from './Integration';

type ConfigProps = {
  onBack: () => void;
};

export default function Config({ onBack }: ConfigProps) {
  const isDark = useColorScheme() === 'dark';
  const [showGoals, setShowGoals] = useState(false);
  const { signOut } = useSession();

  const handleDeleteAccount = useCallback(async () => {
    Alert.alert('Deletar conta', 'Tem certeza? Esta ação é irreversível e todos os seus dados serão removidos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deletar',
        style: 'destructive',
        onPress: async () => {
          await api.delete('/auth/delete');
          signOut();
        },
      },
    ]);
  }, [signOut]);

  if (showGoals) {
    return <Goals onBack={() => setShowGoals(false)} />;
  }

  return (
    <View className="flex-1">
      <ConfigHeader isDark={isDark} onBack={onBack} />

      <ScrollView className="mt-4 flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <AccountSection isDark={isDark} onOpenGoals={() => setShowGoals(true)} />
        <IntegrationSection isDark={isDark} />

        <Pressable
          onPress={handleDeleteAccount}
          accessibilityRole="button"
          className="mt-8 items-center rounded-2xl border px-4 py-3.5 active:opacity-80"
          style={{
            borderColor: isDark ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.25)',
            backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)',
          }}
        >
          <Text className="text-base font-semibold text-red-500">Deletar Conta</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
