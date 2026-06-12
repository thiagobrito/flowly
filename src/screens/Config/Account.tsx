import { ChevronRight } from 'lucide-react-native';

import Card from './components/Card';
import SectionTitle from './components/SectionTitle';
import SettingsRow from './components/SettingsRow';

type AccountSectionProps = {
  isDark: boolean;
  onOpenGoals: () => void;
};

export default function AccountSection({ isDark, onOpenGoals }: AccountSectionProps) {
  return (
    <>
      <SectionTitle isDark={isDark}>Conta</SectionTitle>
      <Card isDark={isDark}>
        <SettingsRow label="Metas & Planejamento" description="Gerencie sua visão e metas de 12 semanas" isDark={isDark} showDivider={false} onPress={onOpenGoals} trailing={<ChevronRight size={20} color={isDark ? '#a1a1aa' : '#71717a'} />} />
      </Card>
    </>
  );
}
