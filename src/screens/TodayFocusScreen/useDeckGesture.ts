import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';

import {
  SNAP_DURATION,
  SWIPE_DISTANCE_THRESHOLD,
  SWIPE_VELOCITY_THRESHOLD,
} from './constants';

type UseDeckGestureParams = {
  itemCount: number;
  initialIndex: number;
  onSnapComplete: (index: number) => void;
};

export const useDeckGesture = ({
  itemCount,
  initialIndex,
  onSnapComplete,
}: UseDeckGestureParams) => {
  const index = useSharedValue(initialIndex);
  const drag = useSharedValue(0);

  const lastIndex = Math.max(0, itemCount - 1);

  const panGesture = Gesture.Pan()
    .enabled(itemCount > 1)
    .activeOffsetY([-12, 12])
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      drag.value = e.translationY;
    })
    .onEnd((e) => {
      const goingUp =
        e.translationY < -SWIPE_DISTANCE_THRESHOLD ||
        e.velocityY < -SWIPE_VELOCITY_THRESHOLD;
      const goingDown =
        e.translationY > SWIPE_DISTANCE_THRESHOLD ||
        e.velocityY > SWIPE_VELOCITY_THRESHOLD;

      const from = index.value;
      let target = from;
      if (goingUp) target = Math.min(from + 1, lastIndex);
      else if (goingDown) target = Math.max(from - 1, 0);

      index.value = withTiming(
        target,
        { duration: SNAP_DURATION },
        (finished) => {
          if (finished && target !== from) {
            runOnJS(onSnapComplete)(target);
          }
        },
      );
      drag.value = withTiming(0, { duration: SNAP_DURATION });
    });

  return { index, drag, panGesture };
};
