/**
 * apps/mobile/src/components/motion/BadgeShimmer.tsx
 *
 * Diagonal shine sweep across a badge, looping every ~3.6 seconds. Used to
 * make "action-needed" badges (REMIND_CHECK_IN, NEW) catch the eye without
 * being annoying. The shimmer band is translucent white; it slides from
 * left to right diagonally, fades in/out at the edges.
 *
 * NOTE: clips to children bounds via overflow:hidden on the wrapper, so the
 * shine only shows over the badge itself, not the surrounding card.
 */

import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

export interface BadgeShimmerProps {
  children: React.ReactNode;
  /** Disable shimmer for non-actionable statuses. Default false. */
  disabled?: boolean;
  /** Approximate badge width — drives travel distance. Default 160. */
  width?: number;
  style?: StyleProp<ViewStyle>;
}

export function BadgeShimmer({
  children,
  disabled,
  width = 160,
  style,
}: BadgeShimmerProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (disabled) {
      progress.value = 0;
      return;
    }
    // 1100ms sweep, ~2500ms idle between = ~3.6s cycle. Idle-then-shine
    // reads as "alive" rather than "loading bar".
    progress.value = withRepeat(
      withDelay(
        2500,
        withTiming(1, {
          duration: 1100,
          easing: Easing.inOut(Easing.cubic),
        }),
      ),
      -1,
      false,
    );
  }, [disabled, progress]);

  const shineStyle = useAnimatedStyle(() => {
    // Travel from off-left (-width) to off-right (+width).
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [-width, width * 2],
      Extrapolation.CLAMP,
    );
    // Fade in mid-sweep, out at edges.
    const opacity = interpolate(
      progress.value,
      [0, 0.2, 0.5, 0.8, 1],
      [0, 0.55, 0.85, 0.55, 0],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateX }, { rotate: '20deg' }],
      opacity,
    };
  });

  if (disabled) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={[{ overflow: 'hidden', borderRadius: 999 }, style]}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: -20,
            bottom: -20,
            width: 40,
            backgroundColor: 'rgba(255,255,255,0.65)',
          },
          shineStyle,
        ]}
      />
    </View>
  );
}
