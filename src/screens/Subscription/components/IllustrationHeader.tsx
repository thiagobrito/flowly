import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import Logo from '../../../../assets/logo.svg';

/**
 * Área ilustrativa do topo. Substituir `Logo` por arte final quando disponível.
 */
export default function IllustrationHeader() {
  return (
    <LinearGradient colors={['#3b82f6', '#6366f1', '#4f46e5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 220 }}>
      <View className="flex-1 items-center justify-center">
        <View className="size-28 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
          <Logo width={72} height={72} />
        </View>
      </View>
    </LinearGradient>
  );
}
