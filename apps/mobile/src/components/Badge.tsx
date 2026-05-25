/**
 * apps/mobile/src/components/Badge.tsx
 *
 * Spec: design-system #5
 */

import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { tokens } from '../theme/tokens';

type Variant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'brand';

const VARIANT: Record<Variant, { bg: string; fg: string }> = {
  default: { bg: tokens.color.neutral100, fg: tokens.color.neutral700 },
  success: { bg: tokens.color.successBg, fg: tokens.color.success },
  warning: { bg: tokens.color.warningBg, fg: tokens.color.warning },
  error: { bg: tokens.color.errorBg, fg: tokens.color.error },
  info: { bg: tokens.color.infoBg, fg: tokens.color.info },
  brand: { bg: tokens.color.brandPrimaryLight, fg: tokens.color.brandPrimary },
};

export interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Badge({ variant = 'default', children, icon, style }: BadgeProps) {
  const v = VARIANT[variant];
  return (
    <View
      style={[
        {
          backgroundColor: v.bg,
          borderRadius: tokens.radius.full,
          paddingHorizontal: tokens.space[2],
          paddingVertical: 2,
          minHeight: 24,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: tokens.space[1],
          alignSelf: 'flex-start',
        },
        style,
      ]}
      accessibilityRole="text"
    >
      {icon}
      <Text
        style={{
          color: v.fg,
          fontSize: tokens.fontSize.labelSm,
          fontWeight: tokens.fontWeight.semibold,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
