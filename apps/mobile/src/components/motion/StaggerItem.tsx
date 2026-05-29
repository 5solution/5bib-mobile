/**
 * apps/mobile/src/components/motion/StaggerItem.tsx
 *
 * List-friendly variant of FadeSlideIn. Pass an `index` and it computes the
 * delay automatically — capped so a 100-item list doesn't take 4 seconds to
 * finish entering. Designed for use inside FlatList renderItem.
 *
 * Usage in FlatList:
 *   <FlatList
 *     renderItem={({ item, index }) => (
 *       <StaggerItem index={index}>
 *         <TicketCard ticket={item} ... />
 *       </StaggerItem>
 *     )}
 *   />
 *
 * NOTE: FlatList recycles views during scroll. After the first paint, items
 * scrolling into view will re-trigger the entrance — usually desirable for
 * the "alive" feel, but can be disabled with `once` prop if it causes jank
 * in long lists.
 */

import React, { useEffect, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

export interface StaggerItemProps {
  children: React.ReactNode;
  /** Position in the list — drives the stagger delay. */
  index: number;
  /** Per-item delay step in ms. Default 50. */
  step?: number;
  /** Max cumulative delay in ms — caps stagger for long lists. Default 320. */
  maxDelay?: number;
  /** Animation duration in ms. Default 380. */
  duration?: number;
  /** Slide distance in px. Default 20. */
  from?: number;
  /** If true, animation runs only once per component instance. Default true. */
  once?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function StaggerItem({
  children,
  index,
  step = 50,
  maxDelay = 320,
  duration = 380,
  from = 20,
  once = true,
  style,
}: StaggerItemProps) {
  const progress = useSharedValue(0);
  const animatedOnce = useRef(false);

  useEffect(() => {
    if (once && animatedOnce.current) return;
    animatedOnce.current = true;
    const delay = Math.min(index * step, maxDelay);
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      }),
    );
  }, [index, step, maxDelay, duration, once, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * from }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
