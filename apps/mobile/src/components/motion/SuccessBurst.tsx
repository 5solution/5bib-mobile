/**
 * apps/mobile/src/components/motion/SuccessBurst.tsx
 *
 * Celebration animation for the post-checkout success state — wraps the
 * status icon with:
 *   1. A spring-in scale (0 → 1.1 → 1) so the icon "lands" with confidence
 *   2. An expanding halo ring that fades out (one shot, like a ripple)
 *   3. A soft repeating glow underneath, signalling "this is the happy path"
 *
 * One-shot bursts run on mount. The glow persists until the component
 * unmounts. The whole thing is Reanimated 3 → UI-thread smooth even if JS
 * is still parsing the success response payload.
 */

import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

export interface SuccessBurstProps {
  children: React.ReactNode;
  /** Halo + glow color. */
  color: string;
  /** Diameter of the wrapper, used to size the halo. */
  size: number;
  /** Disable animation. Default false. */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SuccessBurst({
  children,
  color,
  size,
  disabled,
  style,
}: SuccessBurstProps) {
  // Icon scale: spring from 0 → overshoot 1.1 → settle 1.
  const scale = useSharedValue(disabled ? 1 : 0);
  // Halo ripple: 0 → 1 then opacity fades — one shot.
  const ripple = useSharedValue(0);
  // Glow: looping breathe under the icon.
  const glow = useSharedValue(0);

  useEffect(() => {
    if (disabled) {
      scale.value = 1;
      ripple.value = 0;
      glow.value = 0;
      return;
    }
    // Land the icon with a confident spring.
    scale.value = withSequence(
      withSpring(1.12, { damping: 9, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    );
    // Ripple halo: triggered just after the icon arrives.
    ripple.value = withDelay(
      120,
      withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) }),
    );
    // Slow ambient glow underneath, forever.
    glow.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [disabled, scale, ripple, glow]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(scale.value, [0, 0.4, 1], [0, 0.6, 1], Extrapolation.CLAMP),
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ripple.value, [0, 0.2, 1], [0.5, 0.35, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(ripple.value, [0, 1], [1.0, 1.9], Extrapolation.CLAMP) },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.18, 0.45], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(glow.value, [0, 1], [1.0, 1.18], Extrapolation.CLAMP) },
    ],
  }));

  if (disabled) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Ambient glow (under) */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          glowStyle,
        ]}
      />
      {/* Ripple halo (one shot) */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 3,
            borderColor: color,
          },
          rippleStyle,
        ]}
      />
      {/* Icon */}
      <Animated.View style={iconStyle}>{children}</Animated.View>
    </View>
  );
}
