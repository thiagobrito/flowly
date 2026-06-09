import { Redirect, useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { useSession } from '@/lib/auth';
import Login from '@/screens/Login';

export default function LoginRoute() {
  const router = useRouter();
  const { isHydrated, isAuthenticated, pending, signIn } = useSession();

  if (isHydrated && isAuthenticated) {
    return <Redirect href="/" />;
  }

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    const result = await signIn({ email, password });
    if (result.ok) {
      router.replace('/');
      return;
    }
    Alert.alert('Não foi possível entrar', result.error);
  };

  return <Login pending={pending} onLogin={handleLogin} onNavigateToCreateAccount={() => router.push('/create-account')} />;
}
