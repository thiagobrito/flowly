import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import Logo from '../../../../assets/logo.svg';

type AuthHeaderProps = {
  title: string;
  subtitle: string;
};

export default function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <LinearGradient colors={['#3b82f6', '#6366f1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderBottomLeftRadius: 32, borderBottomRightRadius: 32, height: 300 }}>
      <View className="items-center px-6 pb-14 pt-20">
        <View className="flex-row items-center">
          <Logo width={72} height={72} />
        </View>
        <Text className="mt-3 text-3xl font-bold text-white">{title}</Text>
        <Text className="mt-2 text-center text-sm text-white/80">{subtitle}</Text>
      </View>
    </LinearGradient>
  );
}
