import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { CARD_HEIGHT } from './constants';

type DeckCardProps = {
  isDark: boolean;
  children: ReactNode;
};

export function DeckCard({ isDark, children }: DeckCardProps) {
  return (
    <View
      className="overflow-hidden rounded-3xl border border-white/50 bg-white/40 shadow-lg dark:bg-zinc-900"
      style={{ height: CARD_HEIGHT }}
    >
      <BlurView
        intensity={40}
        tint={isDark ? 'dark' : 'light'}
        className="flex-1 px-4 py-6"
      >
        <View className="absolute inset-0 bg-white/40 dark:bg-white/10" />
        <View className="flex-1">{children}</View>
      </BlurView>
    </View>
  );
}
