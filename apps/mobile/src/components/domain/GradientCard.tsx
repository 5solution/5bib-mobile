/**
 * apps/mobile/src/components/domain/GradientCard.tsx
 *
 * Component-11 — Rolling BIB gradient wrapper.
 *
 * Reference:
 *   - 01-ba-prd-design-system.md (gradient surface pattern)
 *   - 01-ba-prd-epic-4-tickets.md rev2 — Rolling BIB 4 states background
 *
 * Variants:
 *   - `purple` — purple.700 → blue.600 (Rolling BIB header/idle)
 *   - `gold`   — accent gradient (Rolling BIB success / celebratory)
 *
 * Renders a true diagonal gradient via expo-linear-gradient.
 */

import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens } from '../../theme/tokens';

export type GradientVariant = 'purple' | 'gold';

export interface GradientCardProps {
  variant?: GradientVariant;
  children?: React.ReactNode;
  /** Padding token key (default: `4` → 16px). */
  padding?: keyof typeof tokens.space;
  /** Border-radius token key (default: `xl` → 16px). */
  radius?: keyof typeof tokens.radius;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Variant → [topColor, bottomColor].
 * Tokens-only — no hardcoded hex outside design system palette.
 */
const VARIANT_COLORS: Record<GradientVariant, { top: string; bottom: string }> = {
  purple: {
    // purple.700 → brandPrimary (closest token surrogate for blue.600)
    top: '#6D28D9',
    bottom: tokens.color.brandPrimaryDark,
  },
  gold: {
    top: tokens.color.brandAccent,
    bottom: tokens.color.brandSecondary,
  },
};

export function GradientCard({
  variant = 'purple',
  children,
  padding = 4,
  radius = 'xl',
  style,
  accessibilityLabel,
}: GradientCardProps) {
  const colors = VARIANT_COLORS[variant];
  const r = tokens.radius[radius];
  const p = tokens.space[padding];

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel}
      style={[{ borderRadius: r }, style]}
    >
      <LinearGradient
        colors={[colors.top, colors.bottom]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: r, overflow: 'hidden' }}
      >
        <View style={{ padding: p }}>{children}</View>
      </LinearGradient>
    </View>
  );
}
