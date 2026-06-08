import type { ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { STEP } from './constants';

type DeckSlotProps = {
  slotIndex: number;
  index: SharedValue<number>;
  drag: SharedValue<number>;
  children: ReactNode;
};

export const DeckSlot = ({ slotIndex, index, drag, children }: DeckSlotProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const virtualIndex = index.value - drag.value / STEP;
    const d = slotIndex - virtualIndex;
    const absD = Math.min(Math.abs(d), 1);

    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      transform: [{ translateY: d * STEP }, { scale: 1 - absD * 0.09 }],
      opacity: 1 - absD * 0.9,
      zIndex: Math.round(10 - Math.abs(d) * 10),
    };
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};
