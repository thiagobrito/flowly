import { ExternalLink } from 'lucide-react-native';

import { openLegalLink, PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/lib/legal';

import Card from './components/Card';
import SectionTitle from './components/SectionTitle';
import SettingsRow from './components/SettingsRow';

export default function LegalSection({ isDark }: { isDark: boolean }) {
  const iconColor = isDark ? '#a1a1aa' : '#71717a';

  return (
    <>
      <SectionTitle isDark={isDark}>Legal</SectionTitle>
      <Card isDark={isDark}>
        <SettingsRow label="Política de Privacidade" isDark={isDark} onPress={() => openLegalLink(PRIVACY_POLICY_URL)} trailing={<ExternalLink size={18} color={iconColor} />} />
        <SettingsRow label="Termos de Uso (EULA)" isDark={isDark} showDivider={false} onPress={() => openLegalLink(TERMS_OF_USE_URL)} trailing={<ExternalLink size={18} color={iconColor} />} />
      </Card>
    </>
  );
}
