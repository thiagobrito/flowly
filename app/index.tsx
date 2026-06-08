import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { TabKey } from '@/components/BottomTabBar';
import BottomTabBar from '@/components/BottomTabBar';
import NewTask from '@/screens/NewTask';
import Tasks from '@/screens/Tasks/index';

function ActiveScreen({ tab }: { tab: TabKey }) {
  if (tab === 'new') return <NewTask />;
  if (tab === 'progress') return <Tasks />;
  return <Tasks />;
}

function Home() {
  const isDark = useColorScheme() === 'dark';
  const [tab, setTab] = useState<TabKey>('home');

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <LinearGradient colors={isDark ? ['#0b1220', '#070b14', '#000000'] : ['#cfe3f5', '#eaf1f8', '#f7f8fa']} locations={[0, 0.45, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="flex-1 px-3 pt-2">
          <ActiveScreen tab={tab} />

          <BottomTabBar active={tab} onChange={setTab} />
        </View>
      </SafeAreaView>
    </View>
  );
}

export default Home;
