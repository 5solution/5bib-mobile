/**
 * apps/mobile/src/components/domain/CourseCard.tsx
 *
 * Used in race detail + change course flows.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Badge } from '../Badge';
import { tokens } from '../../theme/tokens';

export interface CourseCardData {
  id: string;
  distance: string;
  price: number;
  availableSlots?: number | null;
  saleOpenAt?: string;
  saleCloseAt?: string;
  /** Mark this card as the current course (in change-course flow). */
  current?: boolean;
}

export interface CourseCardProps {
  course: CourseCardData;
  selected?: boolean;
  disabled?: boolean;
  /** Show as radio (multi-option) or simple card. */
  asRadio?: boolean;
  onPress?: () => void;
}

function fmtVnd(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString('vi-VN') + 'đ';
}

export function CourseCard({ course, selected, disabled, asRadio, onPress }: CourseCardProps) {
  const soldOut = course.availableSlots != null && course.availableSlots <= 0;
  const interactionDisabled = disabled || soldOut;

  return (
    <Pressable
      onPress={interactionDisabled ? undefined : onPress}
      accessibilityRole={asRadio ? 'radio' : 'button'}
      accessibilityState={{ checked: selected, disabled: interactionDisabled }}
      accessibilityLabel={`Cự ly ${course.distance}, ${fmtVnd(course.price)}${soldOut ? ', hết vé' : ''}`}
      style={({ pressed }) => ({
        padding: tokens.space[4],
        borderRadius: tokens.radius.lg,
        borderWidth: selected ? 2 : 1,
        borderColor: selected
          ? tokens.color.brandPrimary
          : interactionDisabled
          ? tokens.color.neutral200
          : tokens.color.neutral300,
        backgroundColor: selected
          ? tokens.color.brandPrimaryLight
          : pressed
          ? tokens.color.neutral50
          : tokens.color.surfaceCard,
        opacity: interactionDisabled ? 0.6 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space[3],
      })}
    >
      {asRadio && (
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: selected ? tokens.color.brandPrimary : tokens.color.neutral300,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected && (
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: tokens.color.brandPrimary,
              }}
            />
          )}
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontSize: tokens.fontSize.bodyLg,
            fontWeight: tokens.fontWeight.semibold,
            color: tokens.color.neutral900,
          }}
        >
          {course.distance}
          {course.current ? ' (hiện tại)' : ''}
        </Text>
        <Text style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral600 }}>
          {fmtVnd(course.price)}
          {course.availableSlots != null ? ` · Còn ${course.availableSlots} vé` : ''}
        </Text>
      </View>
      {soldOut && <Badge variant="default">Hết vé</Badge>}
    </Pressable>
  );
}
