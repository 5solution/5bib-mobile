/**
 * apps/mobile/src/components/Skeleton.tsx
 *
 * Spec: design-system #10 — skeleton + shimmer loop 1.5s.
 * Also exports inline Spinner.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, ViewStyle, ActivityIndicator, Text } from 'react-native';
import { tokens } from '../theme/tokens';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: tokens.color.neutral100,
          opacity,
        },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
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
