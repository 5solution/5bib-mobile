/**
 * apps/mobile/src/components/domain/SegmentedTabs.tsx
 *
 * Pill-segmented control with optional count badge per segment.
 * Used by Tickets list tab filter, Orders list tab filter.
 */

import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { tokens } from '../../theme/tokens';

export interface SegmentedTabsProps {
  options: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
  scroll?: boolean;
}

export function SegmentedTabs({ options, value, onChange, scroll }: SegmentedTabsProps) {
  const body = (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        gap: tokens.space[2],
        paddingHorizontal: scroll ? tokens.space[4] : 0,
        paddingVertical: tokens.space[2],
      }}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.count != null ? `${opt.label}, ${opt.count}` : opt.label}
            style={{
              paddingHorizontal: tokens.space[3],
              paddingVertical: tokens.space[2],
              borderRadius: tokens.radius.full,
              backgroundColor: active ? tokens.color.brandPrimary : tokens.color.neutral100,
              flexDirection: 'row',
              alignItems: 'center',
              gap: tokens.space[1],
              minHeight: 36,
            }}
          >
            <Text
              style={{
                color: active ? tokens.color.neutral0 : tokens.color.neutral700,
                fontSize: tokens.fontSize.labelMd,
                fontWeight: tokens.fontWeight.semibold,
              }}
            >
              {opt.label}
            </Text>
            {opt.count != null && (
              <View
                style={{
                  backgroundColor: active ? 'rgba(255,255,255,0.25)' : tokens.color.neutral200,
                  paddingHorizontal: 6,
                  borderRadius: tokens.radius.full,
                  minWidth: 22,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: active ? tokens.color.neutral0 : tokens.color.neutral700,
                    fontSize: tokens.fontSize.labelSm,
                    fontWeight: tokens.fontWeight.semibold,
                  }}
                >
                  {opt.count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {body}
      </ScrollView>
    );
  }
  return body;
}
