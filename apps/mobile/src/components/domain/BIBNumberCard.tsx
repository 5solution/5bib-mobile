/**
 * apps/mobile/src/components/domain/BIBNumberCard.tsx
 *
 * Component-14 — Rolling BIB success card (state 4 of Rolling BIB flow).
 *
 * Reference: 01-ba-prd-epic-4-tickets.md rev2 — Rolling BIB state 4 (settled)
 *
 * Layout:
 *   - White surface card
 *   - Primary-600 header strip ("BIB" label + distance)
 *   - Centered large BIB text (text-6xl, primary-900)
 *   - Race title (heading.h2)
 *   - Gradient footer bar (brand accent → primary)
 */

import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { tokens } from '../../theme/tokens';
import { GradientCard } from './GradientCard';

export interface BIBNumberCardProps {
  /** The settled BIB number (string to preserve leading zeros). */
  bib: string;
  /** Course distance label e.g. "21K", "42K", "10K". */
  distance: string;
  /** Race title (full name). */
  raceName: string;
  style?: StyleProp<ViewStyle>;
}

export function BIBNumberCard({ bib, distance, raceName, style }: BIBNumberCardProps) {
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`BIB ${bib}, cự ly ${distance}, giải ${raceName}`}
      style={[
        {
          backgroundColor: tokens.color.surfaceCard,
          borderRadius: tokens.radius.xl,
          overflow: 'hidden',
          ...tokens.elevation[2],
        },
        style,
      ]}
    >
      {/* Header strip — primary-600 */}
      <View
        style={{
          backgroundColor: tokens.color.brandPrimary,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: tokens.space[4],
          paddingVertical: tokens.space[3],
        }}
      >
        <Text
          style={{
            color: tokens.color.neutral0,
            fontSize: tokens.fontSize.labelLg,
            fontWeight: tokens.fontWeight.bold,
            letterSpacing: 1.5,
          }}
        >
          BIB
        </Text>
        <Text
          style={{
            color: tokens.color.neutral0,
            fontSize: tokens.fontSize.labelLg,
            fontWeight: tokens.fontWeight.semibold,
          }}
        >
          {distance}
        </Text>
      </View>

      {/* Body — centered large BIB number */}
      <View
        style={{
          paddingVertical: tokens.space[8],
          alignItems: 'center',
          gap: tokens.space[3],
        }}
      >
        <Text
          style={{
            fontSize: 64, // text-6xl per spec
            fontWeight: tokens.fontWeight.bold,
            color: '#1E3A8A', // primary-900 surrogate (deepest brand tone)
            fontFamily: tokens.fonts.mono.default,
            letterSpacing: 4,
          }}
          accessibilityLabel={`Số BIB: ${bib}`}
        >
          {bib}
        </Text>
        <Text
          style={{
            fontSize: tokens.fontSize.h2,
            lineHeight: tokens.lineHeight.h2,
            fontWeight: tokens.fontWeight.semibold,
            color: tokens.color.neutral900,
            textAlign: 'center',
            paddingHorizontal: tokens.space[4],
          }}
          numberOfLines={2}
        >
          {raceName}
        </Text>
      </View>

      {/* Gradient footer bar */}
      <GradientCard variant="gold" padding={2} radius="none">
        <View style={{ height: 8 }} />
      </GradientCard>
    </View>
  );
}
