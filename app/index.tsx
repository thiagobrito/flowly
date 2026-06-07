import type { ReactElement } from 'react';
import { Alert } from 'react-native';

import NewTask from '@/screens/NewTask';
import Tasks from '@/screens/Tasks';
import { TodayFocusScreen } from '@/screens/TodayFocusScreen';

const items: ReactElement[] = [
  <NewTask key="new-task-1" />,
  <NewTask key="new-task-2" />,
  <Tasks key="tasks" />,
];

const Home = () => {
  return (
    <TodayFocusScreen<ReactElement>
      items={items}
      initialIndex={1}
      subtitle="Wed, Aug 4"
      keyExtractor={(_, index) => String(index)}
      renderItem={(item) => item}
      onSettingsPress={() => Alert.alert('Settings')}
    />
  );
};

export default Home;
