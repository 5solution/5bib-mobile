/**
 * apps/mobile/src/components/Skeleton.tsx
 *
 * Spec: design-system #10 — skeleton + shimmer loop 1.5s.
 * Also exports inline Spinner.
 *
 * 2026-05-29 (motion rollout): swapped the soft opacity pulse for a real
 * diagonal shimmer sweep (Facebook-style). Built on Reanimated 3 + the
 * Expo linear gradient, so the band runs on the UI thread and stays smooth
 * even while the JS thread is hydrating the screen behind it.
 */

import React, { useEffect } from 'react';
import { View, ViewStyle, ActivityIndicator, Text } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens } from '../theme/tokens';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    // 1.4s shimmer cycle — long enough to feel calm, fast enough to read
    // as loading rather than as a static stripe.
    progress.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }),
      -1,
      false,
    );
  }, [progress]);

  // The shimmer band is a translucent gradient that translates across the
  // skeleton. Width is 60% so the highlight reads as a band, not a wash.
  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [-200, 400],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateX }, { skewX: '-15deg' }],
    };
  });

  return (
    <View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: tokens.color.neutral100,
          overflow: 'hidden',
        },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <AnimatedGradient
        colors={[
          'rgba(255,255,255,0)',
          'rgba(255,255,255,0.85)',
          'rgba(255,255,255,0)',
        ]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 160,
          },
          shimmerStyle,
        ]}
      />
    </View>
  );
}

export interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  label?: string;
}

export function Spinner({ size = 'small', color = tokens.color.brandPrimary, label }: SpinnerProps) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: tokens.space[2] }}>
      <ActivityIndicator size={size} color={color} accessibilityLabel="Đang tải" />
      {label && (
        <Text style={{ color: tokens.color.neutral600, fontSize: tokens.fontSize.bodySm }}>
          {label}
        </Text>
      )}
    </View>
  );
}

/** Full-screen loader — for cold start only (BR-GLOBAL-09). `inline` = overlay (not full screen). */
export function FullScreenLoading({
  label = 'Đang tải...',
  inline = false,
}: { label?: string; inline?: boolean }) {
  return (
    <View
      style={{
        flex: inline ? undefined : 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: inline ? 'transparent' : tokens.color.surfaceBg,
        paddingVertical: inline ? tokens.space[4] : 0,
      }}
      accessibilityRole="progressbar"
    >
      <Spinner size="large" label={label} />
    </View>
  );
}
