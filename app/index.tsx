import type { ReactElement } from 'react';
import { Alert } from 'react-native';

import NewTask from '@/screens/NewTask';
import Tasks from '@/screens/Tasks';
import { TodayFocusScreen } from '@/screens/TodayFocusScreen';

const items: ReactElement[] = [
  <Tasks key="tasks" />,
  <NewTask key="new-task" />,
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
