/**
 * apps/mobile/src/components/Card.tsx
 *
 * Spec: design-system #4
 * Variants: default | race | ticket | order | result
 * Tappable card supports pressed state.
 */

import React from 'react';
import { View, Pressable, ViewStyle } from 'react-native';
import { tokens } from '../theme/tokens';

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

  const cardStyle: ViewStyle = {
    backgroundColor: tokens.color.surfaceCard,
    borderRadius: tokens.radius.lg,
    padding: padValue,
    ...tokens.elevation[1],
    ...style,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        testID={testID}
        style={({ pressed }) => [
          cardStyle,
          pressed && { backgroundColor: tokens.color.neutral50, transform: [{ translateY: 1 }] },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} testID={testID}>
      {children}
    </View>
  );
}
