import { Alert, useColorScheme } from 'react-native';

import type { DeckItem } from '@/screens/TodayFocusScreen';
import { TaskCardContent, TodayFocusScreen } from '@/screens/TodayFocusScreen';

const items: DeckItem[] = [
  {
    id: 'next',
    kind: 'task',
    label: 'Next Up',
    title: 'Create a Type Specimen Poster',
    description:
      'Design a poster showcasing type hierarchy, pairing, and readability using your workbook exercises.',
    durationLabel: '1h 30m',
    buttonLabel: 'Start next',
  },
  {
    id: 'focus',
    kind: 'task',
    label: "Today's focus",
    title: 'Study Typography Fundamentals',
    description:
      'Learn about font pairing, hierarchy, and readability. Complete the typography exercise in your design workbook.',
    durationLabel: '2h',
    buttonLabel: 'Start task',
    avatarUrl: 'https://i.pravatar.cc/100?img=47',
    showWeek: true,
  },
];

const Home = () => {
  const isDark = useColorScheme() === 'dark';

  return (
    <TodayFocusScreen<DeckItem>
      items={items}
      initialIndex={1}
      subtitle="Wed, Aug 4"
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <TaskCardContent item={item as any} isDark={isDark} />
      )}
      onSettingsPress={() => Alert.alert('Settings')}
    />
  );
};

export default Home;
