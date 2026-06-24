import { useRouter } from 'expo-router';

import Paywall from '@/screens/Paywall';

export default function PaywallRoute() {
  const router = useRouter();

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return <Paywall onClose={handleClose} />;
}
