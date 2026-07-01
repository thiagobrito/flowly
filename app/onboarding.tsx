import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/lib/auth';
import { useOnboarding } from '@/lib/onboarding';
import Onboarding from '@/screens/Onboarding';
import Background from '@/screens/Onboarding/components/Background';

export default function OnboardingRoute() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { isHydrated, isAuthenticated } = useSession();
  const { markCompleted } = useOnboarding();

  if (!isHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Background isDark={isDark} />
        <ActivityIndicator color={isDark ? '#e4e4e7' : '#6366f1'} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const handleComplete = () => {
    markCompleted();
    router.replace('/');
  };

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <Background isDark={isDark} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View className="flex-1 px-4 pt-2">
          <Onboarding isDark={isDark} onComplete={handleComplete} />
        </View>
      </SafeAreaView>
    </View>
  );
}
