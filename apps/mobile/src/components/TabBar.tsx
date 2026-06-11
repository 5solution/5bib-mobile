/**
 * apps/mobile/src/components/TabBar.tsx
 *
 * Spec: design-system #12 — Bottom navigation, 4 tabs.
 * Used as `tabBar` prop in Expo Router (tabs) layout.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../theme/tokens';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

/**
 * Proper icon set (Ionicons ships with Expo) — replaced the emoji tab
 * icons (🏠🎫📋👤) that read as a prototype, not a product. Outline when
 * idle, filled when focused — the standard iOS tab idiom.
 */
const ICON_MAP: Record<string, { idle: keyof typeof Ionicons.glyphMap; focused: keyof typeof Ionicons.glyphMap }> = {
  home: { idle: 'home-outline', focused: 'home' },
  tickets: { idle: 'ticket-outline', focused: 'ticket' },
  orders: { idle: 'receipt-outline', focused: 'receipt' },
  profile: { idle: 'person-outline', focused: 'person' },
};

const LABEL_KEY_MAP: Record<string, string> = {
  home: 'browse.upcomingRaces',
  tickets: 'tickets.tabTitle',
  orders: 'orders.tabTitle',
  profile: 'profile.title',
};

/**
 * Pass via:
 *   <Tabs tabBar={(p) => <TabBar {...p} />}>
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: tokens.color.surfaceCard,
        borderTopWidth: 1,
        borderTopColor: tokens.color.neutral200,
        paddingBottom: insets.bottom,
        flexDirection: 'row',
      }}
      accessibilityRole="tablist"
    >
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        if (!descriptor) return null;
        const { options } = descriptor;
        const focused = state.index === index;
        const label =
          (typeof options.tabBarLabel === 'string' && options.tabBarLabel) ||
          options.title ||
          route.name;
        const icon = ICON_MAP[route.name];

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityLabel={String(label)}
            accessibilityState={{ selected: focused }}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: tokens.space[2],
              minHeight: 56,
              gap: 2,
            }}
            testID={`tab-${route.name}`}
          >
            {focused && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  height: 2,
                  width: 32,
                  backgroundColor: tokens.color.brandPrimary,
                  borderRadius: 1,
                }}
              />
            )}
            <Ionicons
              name={icon ? (focused ? icon.focused : icon.idle) : 'ellipse-outline'}
              size={23}
              color={focused ? tokens.color.brandPrimary : tokens.color.neutral500}
            />
            <Text
              style={{
                fontSize: tokens.fontSize.labelSm,
                fontWeight: focused ? tokens.fontWeight.semibold : tokens.fontWeight.regular,
                color: focused ? tokens.color.brandPrimary : tokens.color.neutral500,
              }}
              numberOfLines={1}
            >
              {String(label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
