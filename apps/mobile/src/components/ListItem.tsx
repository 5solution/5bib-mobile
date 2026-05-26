/**
 * apps/mobile/src/components/ListItem.tsx
 *
 * Spec: design-system #14 — settings row / nav item.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { tokens } from '../theme/tokens';

export interface ListItemProps {
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailingText?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  divider?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  accessibilityLabel?: string;
}

export function ListItem({
  leading,
  title,
  subtitle,
  trailingText,
  trailing,
  onPress,
  showChevron = true,
  destructive,
  divider,
  disabled,
  accessibilityHint,
  accessibilityLabel,
}: ListItemProps) {
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tokens.space[4],
        paddingVertical: subtitle ? tokens.space[3] : tokens.space[3],
        minHeight: subtitle ? 72 : 56,
        gap: tokens.space[3],
        opacity: disabled ? 0.5 : 1,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: tokens.color.neutral100,
      }}
    >
      {leading && <View style={{ width: 40, alignItems: 'center' }}>{leading}</View>}
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontSize: tokens.fontSize.bodyLg,
            fontWeight: tokens.fontWeight.medium,
            color: destructive ? tokens.color.error : tokens.color.neutral900,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral600 }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {trailingText && (
        <Text style={{ fontSize: tokens.fontSize.bodyMd, color: tokens.color.neutral500 }}>
          {trailingText}
        </Text>
      )}
      {trailing}
      {showChevron && onPress && (
        <Text style={{ color: tokens.color.neutral400, fontSize: 18 }}>›</Text>
      )}
    </View>
  );

  if (!onPress || disabled) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
      accessibilityHint={accessibilityHint}
      android_ripple={{ color: tokens.color.neutral100 }}
      style={({ pressed }) => [pressed && { backgroundColor: tokens.color.neutral50 }]}
    >
      {content}
    </Pressable>
  );
}
