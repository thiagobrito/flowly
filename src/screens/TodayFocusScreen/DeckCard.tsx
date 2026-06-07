import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { CARD_HEIGHT } from './constants';

type DeckCardProps = {
  isDark: boolean;
  children: ReactNode;
};

export const DeckCard = ({ isDark, children }: DeckCardProps) => (
  <View
    className="overflow-hidden rounded-3xl border border-white/50 shadow-lg"
    style={{ height: CARD_HEIGHT }}
  >
    <BlurView
      intensity={40}
      tint={isDark ? 'dark' : 'light'}
      className="flex-1 p-6"
    >
      <View className="absolute inset-0 bg-white/40 dark:bg-white/10" />
      <View className="flex-1">{children}</View>
    </BlurView>
  </View>
);
