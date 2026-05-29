/**
 * apps/mobile/src/components/motion/PressScale.tsx
 *
 * Tactile press-down feedback — scales the child to ~0.96 while pressed,
 * springs back on release. The detail being "spring back, not linear" is
 * what separates an iOS-y feel from a cheap Android-y feel.
 *
 * Use as a drop-in replacement for Pressable when you want a satisfying tap.
 *
 * Usage:
 *   <PressScale onPress={handle}>
 *     <View style={...}><Text>Tap me</Text></View>
 *   </PressScale>
 */

import React from 'react';
import { Pressable, StyleProp, ViewStyle, AccessibilityRole } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export interface PressScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  /** Scale to shrink to while pressed. Default 0.96 (subtle). */
  scaleTo?: number;
  /** Disable interaction + animation. Default false. */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
}

export function PressScale({
  children,
  onPress,
  scaleTo = 0.96,
  disabled,
  style,
  accessibilityLabel,
  accessibilityRole = 'button',
}: PressScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        if (!disabled) {
          // Snap down quickly — a press feel is ABOUT the down-stroke.
          scale.value = withTiming(scaleTo, { duration: 80 });
        }
      }}
      onPressOut={() => {
        // Spring back — the release is where the personality lives.
        scale.value = withSpring(1, { damping: 12, stiffness: 220 });
      }}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={style}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}
