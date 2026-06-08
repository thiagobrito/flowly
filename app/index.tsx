import type { ReactElement } from 'react';
import { Alert } from 'react-native';

import { useEnergyScore } from '@/lib/energy';
import { TodayFocusScreen } from '@/screens/BaseScreen';
import NewTask from '@/screens/NewTask';
import Tasks from '@/screens/Tasks';

const items: ReactElement[] = [
  <Tasks key="tasks" />,
  <NewTask key="new-task" />,
];

function Home() {
  const energy = useEnergyScore();
  return (
    <TodayFocusScreen<ReactElement>
      items={items}
      initialIndex={1}
      keyExtractor={(_, index: number) => String(index)}
      renderItem={(item: ReactElement) => item}
      onSettingsPress={() => Alert.alert('Settings')}
      energyInfo={energy}
    />
  );
}

export default Home;
