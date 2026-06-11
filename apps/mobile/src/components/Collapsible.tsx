/**
 * apps/mobile/src/components/Collapsible.tsx
 *
 * Accordion section matching the web ticket-detail accordions
 * ("Giới thiệu giải chạy" / "Lịch trình sự kiện" / "Điều lệ giải" …):
 * bordered card, bold title row with a chevron that rotates open/closed,
 * content revealed below.
 */

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { tokens } from '../theme/tokens';

export interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  /** Render expanded on mount (web expands the first section). */
  initiallyOpen?: boolean;
}

export function Collapsible({ title, children, initiallyOpen = false }: CollapsibleProps) {
  const [open, setOpen] = useState(initiallyOpen);
  const rotation = useSharedValue(initiallyOpen ? 1 : 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 180}deg` }],
  }));

  const toggle = () => {
    rotation.value = withTiming(open ? 0 : 1, { duration: 180 });
    setOpen((o) => !o);
  };

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: tokens.color.neutral200,
        borderRadius: tokens.radius.lg,
        backgroundColor: tokens.color.surfaceCard,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: tokens.space[4],
          paddingVertical: tokens.space[3],
          backgroundColor: pressed ? tokens.color.neutral50 : tokens.color.surfaceCard,
        })}
      >
        <Text
          style={{
            flex: 1,
            fontSize: tokens.fontSize.bodyLg,
            fontWeight: tokens.fontWeight.semibold,
            color: tokens.color.neutral900,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Animated.Text
          style={[{ fontSize: 14, color: tokens.color.neutral500 }, chevronStyle]}
        >
          ▼
        </Animated.Text>
      </Pressable>
      {open ? (
        <View
          style={{
            paddingHorizontal: tokens.space[4],
            paddingBottom: tokens.space[4],
            borderTopWidth: 1,
            borderTopColor: tokens.color.neutral100,
            paddingTop: tokens.space[3],
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}
