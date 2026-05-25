/**
 * apps/mobile/src/components/Header.tsx
 *
 * Spec: design-system #13 — stack header.
 * Variants: default | with-subtitle | transparent (overlay on hero)
 */

import React from 'react';
import { View, Text, Pressable, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../theme/tokens';

export interface HeaderAction {
  icon: React.ReactNode | string;
  label: string;
  onPress: () => void;
  testID?: string;
}

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  /** Title alignment. iOS default: center; Android default: left. */
  titleAlign?: 'left' | 'center';
  leading?: 'back' | 'close' | 'none' | React.ReactNode;
  onLeadingPress?: () => void;
  actions?: HeaderAction[];
  transparent?: boolean;
  /** Show bottom border. Default true unless transparent. */
  showBorder?: boolean;
  largeTitle?: boolean;
  style?: ViewStyle;
}

export function Header({
  title,
  subtitle,
  titleAlign = 'center',
  leading = 'back',
  onLeadingPress,
  actions = [],
  transparent,
  showBorder,
  largeTitle,
  style,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const bg = transparent ? 'transparent' : tokens.color.surfaceBg;
  const fg = transparent ? tokens.color.neutral0 : tokens.color.neutral900;

  const showLeadingChrome = leading !== 'none';

  return (
    <View
      style={[
        {
          backgroundColor: bg,
          paddingTop: insets.top,
          borderBottomWidth: showBorder ?? !transparent ? 1 : 0,
          borderBottomColor: tokens.color.neutral200,
        },
        style,
      ]}
    >
      <View
        style={{
          height: tokens.layout.headerHeight,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: tokens.space[2],
        }}
      >
        {showLeadingChrome ? (
          typeof leading === 'string' ? (
            <Pressable
              onPress={onLeadingPress}
              accessibilityRole="button"
              accessibilityLabel={leading === 'back' ? 'Quay lại' : 'Đóng'}
              hitSlop={12}
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 22, color: fg }}>{leading === 'back' ? '←' : '✕'}</Text>
            </Pressable>
          ) : (
            leading
          )
        ) : (
          <View style={{ width: 8 }} />
        )}

        {title && !largeTitle && (
          <View
            style={{
              flex: 1,
              alignItems: titleAlign === 'center' ? 'center' : 'flex-start',
              paddingHorizontal: tokens.space[2],
            }}
          >
            <Text
              style={{
                fontSize: tokens.fontSize.h3,
                fontWeight: tokens.fontWeight.semibold,
                color: fg,
              }}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                style={{
                  fontSize: tokens.fontSize.bodySm,
                  color: transparent ? tokens.color.neutral200 : tokens.color.neutral600,
                }}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
        )}

        {!title && <View style={{ flex: 1 }} />}

        <View style={{ flexDirection: 'row', gap: tokens.space[1], alignItems: 'center' }}>
          {actions.map((a, i) => (
            <Pressable
              key={i}
              onPress={a.onPress}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              hitSlop={8}
              testID={a.testID}
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {typeof a.icon === 'string' ? (
                <Text style={{ fontSize: 22, color: fg }}>{a.icon}</Text>
              ) : (
                a.icon
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {largeTitle && title && (
        <View style={{ paddingHorizontal: tokens.space[4], paddingBottom: tokens.space[3] }}>
          <Text
            style={{
              fontSize: tokens.fontSize.h1,
              fontWeight: tokens.fontWeight.bold,
              color: fg,
            }}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={{ fontSize: tokens.fontSize.bodyMd, color: tokens.color.neutral600 }}
            >
              {subtitle}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
