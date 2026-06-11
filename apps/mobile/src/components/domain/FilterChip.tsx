/**
 * apps/mobile/src/components/domain/FilterChip.tsx
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../../theme/tokens';

export interface FilterChipProps {
  label: string;
  onRemove?: () => void;
  onPress?: () => void;
  active?: boolean;
}

export function FilterChip({ label, onRemove, onPress, active = true }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={onRemove ? `Bộ lọc ${label}, nhấn để xoá` : `Bộ lọc ${label}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space[1],
        paddingHorizontal: tokens.space[3],
        paddingVertical: tokens.space[1],
        borderRadius: tokens.radius.full,
        backgroundColor: active ? tokens.color.brandPrimaryLight : tokens.color.neutral100,
        borderWidth: 1,
        borderColor: active ? tokens.color.brandPrimary + '55' : tokens.color.neutral200,
        minHeight: 32,
      }}
    >
      <Ionicons
        name="pricetag-outline"
        size={13}
        color={active ? tokens.color.brandPrimary : tokens.color.neutral700}
      />
      <Text
        style={{
          fontSize: tokens.fontSize.labelSm,
          fontWeight: tokens.fontWeight.medium,
          color: active ? tokens.color.brandPrimary : tokens.color.neutral700,
        }}
      >
        {label}
      </Text>
      {onRemove && (
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Xoá bộ lọc ${label}`}
          hitSlop={8}
        >
          <Text
            style={{
              fontSize: 14,
              color: active ? tokens.color.brandPrimary : tokens.color.neutral500,
            }}
          >
            ✕
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}
