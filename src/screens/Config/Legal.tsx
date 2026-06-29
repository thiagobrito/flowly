import * as Sentry from '@sentry/react-native';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink } from 'lucide-react-native';

import Card from './components/Card';
import SectionTitle from './components/SectionTitle';
import SettingsRow from './components/SettingsRow';

const PRIVACY_POLICY_URL = 'https://furqahh8duzndywu.public.blob.vercel-storage.com/politica_de_privacidade.pdf';
const TERMS_OF_USE_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export default function LegalSection({ isDark }: { isDark: boolean }) {
  const iconColor = isDark ? '#a1a1aa' : '#71717a';

  const openLink = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      Sentry.captureException(error);
    }
  };

  return (
    <>
      <SectionTitle isDark={isDark}>Legal</SectionTitle>
      <Card isDark={isDark}>
        <SettingsRow label="Política de Privacidade" isDark={isDark} onPress={() => openLink(PRIVACY_POLICY_URL)} trailing={<ExternalLink size={18} color={iconColor} />} />
        <SettingsRow label="Termos de Uso (EULA)" isDark={isDark} showDivider={false} onPress={() => openLink(TERMS_OF_USE_URL)} trailing={<ExternalLink size={18} color={iconColor} />} />
      </Card>
    </>
  );
}
