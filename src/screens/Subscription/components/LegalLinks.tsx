import { Pressable, Text, View } from 'react-native';

import { openLegalLink, PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '@/lib/legal';

type LegalLinksProps = {
  isDark: boolean;
};

/**
 * Bloco de informações legais exibido no fluxo de compra (paywall).
 *
 * Exigido pela App Store (Guideline 3.1.2(c)) para assinaturas auto-renováveis:
 * deixa claro a renovação automática e fornece links funcionais para a Política
 * de Privacidade e os Termos de Uso (EULA).
 */
export default function LegalLinks({ isDark }: LegalLinksProps) {
  const mutedColor = isDark ? '#71717a' : '#a1a1aa';
  const linkColor = isDark ? '#93c5fd' : '#3b82f6';

  return (
    <View className="mt-2">
      <Text className="text-center text-[11px] leading-4" style={{ color: mutedColor }}>
        A assinatura é renovada automaticamente, salvo cancelamento até 24h antes do fim do período. O pagamento é cobrado na sua conta da App Store e a renovação pode ser gerenciada nos Ajustes.
      </Text>

      <View className="mt-2 flex-row items-center justify-center">
        <Pressable onPress={() => openLegalLink(TERMS_OF_USE_URL)} accessibilityRole="link" className="active:opacity-70">
          <Text className="text-[12px] font-medium underline" style={{ color: linkColor }}>
            Termos de Uso (EULA)
          </Text>
        </Pressable>

        <Text className="px-2 text-[12px]" style={{ color: mutedColor }}>
          •
        </Text>

        <Pressable onPress={() => openLegalLink(PRIVACY_POLICY_URL)} accessibilityRole="link" className="active:opacity-70">
          <Text className="text-[12px] font-medium underline" style={{ color: linkColor }}>
            Política de Privacidade
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
