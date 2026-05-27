/**
 * apps/mobile/src/components/domain/StatusBadge.tsx
 *
 * Component-19 — Race status badge (4 variants).
 *
 * Reference:
 *   - 01-ba-prd-epic-2-browsing.md — race lifecycle states
 *   - 01-ba-prd-design-system.md — Badge primitive
 *
 * Variants:
 *   - OPEN_FOR_SALE → green
 *   - COMING_SOON   → yellow
 *   - CLOSED        → gray
 *   - FINISHED      → dark gray
 *
 * Thin wrapper over existing `Badge` primitive to enforce label + variant
 * mapping consistently across browsing / detail / list screens.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { tokens } from '../../theme/tokens';

export type RaceStatus = 'OPEN_FOR_SALE' | 'COMING_SOON' | 'CLOSED' | 'FINISHED';
export type StatusBadgeSize = 'sm' | 'md';

interface VariantStyle {
  bg: string;
  fg: string;
  label: string;
}

const STATUS_VARIANT: Record<string, VariantStyle> = {
  OPEN_FOR_SALE: {
    bg: tokens.color.successBg,
    fg: tokens.color.success,
    label: 'Đang mở bán',
  },
  COMING_SOON: {
    bg: tokens.color.warningBg,
    fg: tokens.color.warning,
    label: 'Sắp mở bán',
  },
  CLOSED: {
    bg: tokens.color.neutral100,
    fg: tokens.color.neutral600,
    label: 'Đã đóng',
  },
  FINISHED: {
    bg: tokens.color.neutral200,
    fg: tokens.color.neutral800,
    label: 'Đã kết thúc',
  },
  // Backend also returns these values for race status:
  COMPLETE: {
    bg: tokens.color.neutral200,
    fg: tokens.color.neutral800,
    label: 'Đã kết thúc',
  },
  GENERATED_CODE: {
    bg: tokens.color.successBg,
    fg: tokens.color.success,
    label: 'Đang mở bán',
  },
};

const FALLBACK_VARIANT: VariantStyle = {
  bg: tokens.color.neutral100,
  fg: tokens.color.neutral600,
  label: '—',
};

export interface StatusBadgeProps {
  /** Widened to string — backend may return any of 6+ values per API_REFERENCE. */
  status: RaceStatus | string;
  size?: StatusBadgeSize;
  /** Override the default VN label. */
  label?: string;
}

export function StatusBadge({ status, size = 'md', label }: StatusBadgeProps) {
  const v = STATUS_VARIANT[String(status ?? '')] ?? FALLBACK_VARIANT;
  const isSm = size === 'sm';
  const fontSize = isSm ? tokens.fontSize.labelSm : tokens.fontSize.labelMd;
  const padH = isSm ? tokens.space[2] : tokens.space[3];
  const padV = isSm ? 2 : tokens.space[1];
  const minH = isSm ? 20 : 24;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label ?? v.label}
      style={{
        backgroundColor: v.bg,
        borderRadius: tokens.radius.full,
        paddingHorizontal: padH,
        paddingVertical: padV,
        minHeight: minH,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          color: v.fg,
          fontSize,
          fontWeight: tokens.fontWeight.semibold,
        }}
      >
        {label ?? v.label}
      </Text>
    </View>
  );
}
