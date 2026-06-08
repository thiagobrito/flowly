import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CARD_HEIGHT, PEEK } from './constants';
import { DeckCard } from './DeckCard';
import { DeckSlot } from './DeckSlot';
import { DotsIndicator } from './DotsIndicator';
import type { TodayFocusScreenProps } from './types';
import { useDeckGesture } from './useDeckGesture';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function TodayFocusScreen<T>({
  items,
  initialIndex = 0,
  keyExtractor,
  renderItem,
  onIndexChange,
}: TodayFocusScreenProps<T>) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const lastIndex = Math.max(0, items.length - 1);
  const startIndex = clamp(initialIndex, 0, lastIndex);

  const [activeIndex, setActiveIndex] = useState(startIndex);

  const handleSnapComplete = useCallback(
    (targetIndex: number) => {
      setActiveIndex(targetIndex);
      const item = items[targetIndex];
      if (item !== undefined) onIndexChange?.(targetIndex, item);
    },
    [items, onIndexChange],
  );

  const { index, drag, panGesture } = useDeckGesture({
    itemCount: items.length,
    initialIndex: startIndex,
    onSnapComplete: handleSnapComplete,
  });

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <LinearGradient
        colors={isDark ? ['#0b1220', '#070b14', '#000000'] : ['#cfe3f5', '#eaf1f8', '#f7f8fa']}
        locations={[0, 0.45, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="flex-1 px-3">
          {/* Deck vertical de N cards */}
          <View className="relative mt-4 flex-1" style={{ minHeight: CARD_HEIGHT + PEEK * 2 }}>
            <GestureDetector gesture={panGesture}>
              <View className="flex-1">
                {items.map((item, i) => (
                  <DeckSlot key={keyExtractor?.(item, i) ?? String(i)} slotIndex={i} index={index} drag={drag}>
                    <DeckCard isDark={isDark}>{renderItem(item, i)}</DeckCard>
                  </DeckSlot>
                ))}
              </View>
            </GestureDetector>

            <DotsIndicator count={items.length} activeIndex={activeIndex} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
