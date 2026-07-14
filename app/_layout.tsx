import '../global.css';

import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configureNotifications, ensureAndroidChannel, setupNotificationHandler, useNotifications } from '@/lib/notifications';
import { QueryProvider } from '@/lib/query';
import { useThemePreference } from '@/lib/theme';
import { useTaskReminders } from '@/screens/Config/hooks/useTaskReminders';

setupNotificationHandler();
configureNotifications({
  telemetry: {
    addBreadcrumb: (message, data) => Sentry.addBreadcrumb({ category: 'notifications', message, data }),
    reportError: (error) => Sentry.captureException(error),
  },
});
ensureAndroidChannel().catch(() => undefined);

Sentry.init({
  dsn: 'https://a2476257c2a1c6711c1f36d720aa3342@o1297145.ingest.us.sentry.io/4511544158715904',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

export default Sentry.wrap(function Layout() {
  useNotifications();
  useTaskReminders();
  useThemePreference();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryProvider>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </SafeAreaProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
});
