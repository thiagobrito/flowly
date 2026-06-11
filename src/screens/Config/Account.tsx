import { ChevronRight } from 'lucide-react-native';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import Card from './components/Card';
import SectionTitle from './components/SectionTitle';
import SettingsRow from './components/SettingsRow';

export default function AccountSection({ isDark }: { isDark: boolean }) {
  const handleUpdateGoals = useCallback(() => {
    Alert.alert('Em breve', 'A atualização de objetivos estará disponível em breve.');
  }, []);
  return (
    <>
      <SectionTitle isDark={isDark}>Conta</SectionTitle>
      <Card isDark={isDark}>
        <SettingsRow label="Atualizar Objetivos" description="Revise e ajuste suas metas pessoais" isDark={isDark} showDivider={false} onPress={() => handleUpdateGoals()} trailing={<ChevronRight size={20} color={isDark ? '#a1a1aa' : '#71717a'} />} />
      </Card>
    </>
  );
}
