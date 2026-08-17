import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { ACCENT, ACCENT_LIGHT } from '@/lib/theme';

import Logo from '../../../../assets/logo.svg';

/**
 * Área ilustrativa do topo. Substituir `Logo` por arte final quando disponível.
 */
export default function IllustrationHeader() {
  return (
    <LinearGradient colors={[ACCENT_LIGHT, ACCENT, ACCENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 220 }}>
      <View className="flex-1 items-center justify-center">
        <View className="size-28 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
          <Logo width={72} height={72} />
        </View>
      </View>
    </LinearGradient>
  );
}
