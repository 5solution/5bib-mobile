/**
 * apps/mobile/src/components/EmptyState.tsx
 *
 * Spec: design-system #9
 */

import React from 'react';
import { View, Text } from 'react-native';
import { tokens } from '../theme/tokens';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  ctaLabel?: string;
  onPress?: () => void;
  variant?: 'default' | 'inline';
}

export function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  onPress,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: tokens.space[6],
        paddingVertical: variant === 'inline' ? tokens.space[6] : tokens.space[9],
      }}
      accessibilityRole="text"
    >
      {icon && (
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: tokens.color.neutral100,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: tokens.space[4],
          }}
        >
          {icon}
        </View>
      )}
      <Text
        style={{
          fontSize: tokens.fontSize.h3,
          fontWeight: tokens.fontWeight.semibold,
          color: tokens.color.neutral900,
          textAlign: 'center',
          marginBottom: tokens.space[2],
        }}
      >
        {title}
      </Text>
      {description && (
        <Text
          style={{
            fontSize: tokens.fontSize.bodyMd,
            color: tokens.color.neutral600,
            textAlign: 'center',
            lineHeight: tokens.lineHeight.bodyMd,
            marginBottom: tokens.space[5],
            maxWidth: 320,
          }}
        >
          {description}
        </Text>
      )}
      {ctaLabel && onPress && (
        <Button variant="primary" size="md" onPress={onPress}>
          {ctaLabel}
        </Button>
      )}
    </View>
  );
}
