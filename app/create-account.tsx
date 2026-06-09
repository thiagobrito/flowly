import { Redirect, useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { useSession } from '@/lib/auth';
import CreateAccount from '@/screens/CreateAccount';

export default function CreateAccountRoute() {
  const router = useRouter();
  const { isHydrated, isAuthenticated, pending, signUp } = useSession();

  if (isHydrated && isAuthenticated) {
    return <Redirect href="/" />;
  }

  const handleCreateAccount = async ({ email, password }: { email: string; password: string }) => {
    const result = await signUp({ email, password });
    if (result.ok) {
      router.replace('/');
      return;
    }
    Alert.alert('Não foi possível criar a conta', result.error);
  };

  const goToLogin = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/login');
  };

  return <CreateAccount pending={pending} onCreateAccount={handleCreateAccount} onNavigateToLogin={goToLogin} />;
}
