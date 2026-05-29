/**
 * apps/mobile/src/components/motion/FadeSlideIn.tsx
 *
 * Mount-time fade + slide-up animation, à la GSAP `from({y: 16, opacity: 0})`.
 * Use it to give sections a staggered hero entrance — first paint hides the
 * content, then slides it up while fading in. Built on Reanimated 3 so it
 * runs on the UI thread (no JS-thread jank during scroll-mount).
 *
 * Usage:
 *   <FadeSlideIn delay={0}><HeroCard /></FadeSlideIn>
 *   <FadeSlideIn delay={80}><InfoSection /></FadeSlideIn>
 *   <FadeSlideIn delay={160}><Actions /></FadeSlideIn>
 *
 * Pass `key` if you want it to re-trigger when content changes.
 */

import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

export interface FadeSlideInProps {
  children: React.ReactNode;
  /** Delay before animation starts, in ms. Default 0. */
  delay?: number;
  /** Duration of animation, in ms. Default 420. */
  duration?: number;
  /** Distance to slide from, in px. Default 16 (slides up from below). */
  from?: number;
  style?: StyleProp<ViewStyle>;
}

export function FadeSlideIn({
  children,
  delay = 0,
  duration = 420,
  from = 16,
  style,
}: FadeSlideInProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    // GSAP-ish easing: power2.out → quadratic decel feels organic on mobile.
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      }),
    );
  }, [delay, duration, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * from }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
