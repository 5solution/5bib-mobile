/**
 * apps/mobile/src/components/Card.tsx
 *
 * Spec: design-system #4
 * Variants: default | race | ticket | order | result
 * Tappable card supports pressed state.
 *
 * Press feedback uses Reanimated 3 — scale to 0.97 on press, spring back on
 * release. This applies wherever Card is used (RaceCard, TicketCard,
 * OrderCard, CourseCard, …) so the whole app gets a consistent tactile feel
 * without each card needing to know about animations.
 */

import React from 'react';
import { View, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { tokens } from '../theme/tokens';
import { haptics } from './motion/haptics';

export interface CardProps {
  onPress?: () => void;
  children?: React.ReactNode;
  padding?: keyof typeof tokens.space | 'none';
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export function Card({
  onPress,
  children,
  padding = 4,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: CardProps) {
  const padValue = padding === 'none' ? 0 : tokens.space[padding];
  const scale = useSharedValue(1);

  const cardStyle: ViewStyle = {
    backgroundColor: tokens.color.surfaceCard,
    borderRadius: tokens.radius.lg,
    padding: padValue,
    ...tokens.elevation[1],
    ...style,
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          // Quick down-stroke (~80ms) registers the touch instantly.
          scale.value = withTiming(0.97, { duration: 80 });
          // Light haptic — every tappable card gets a tiny tactile click.
          haptics.light();
        }}
        onPressOut={() => {
          // Spring back — release is where the feel lives.
          scale.value = withSpring(1, { damping: 12, stiffness: 220 });
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        testID={testID}
      >
        <Animated.View style={[cardStyle, animatedStyle]}>{children}</Animated.View>
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} testID={testID}>
      {children}
    </View>
  );
}
