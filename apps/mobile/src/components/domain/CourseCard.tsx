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
  /**
   * Phase gating (web parity G-13). 'notYetOpen' renders a "Chưa mở" badge
   * + open date and blocks selection; 'closed' renders "Đã đóng" and blocks
   * selection. Omit / 'open' → normal selectable row.
   */
  saleState?: 'open' | 'notYetOpen' | 'closed';
  /** Mark this card as the current course (in change-course flow). */
  current?: boolean;
  /**
   * Tier name (Family / ELB / VIP / Ultra / Thường). When set, renders as a
   * small badge next to the distance so the user can distinguish multiple
   * tiers of the same distance. Web shows this prominently (e.g. "Family –
   * FAMILY 300,000đ"). Omit for single-tier courses.
   */
  tierName?: string;
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

function fmtShortDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function CourseCard({ course, selected, disabled, asRadio, onPress }: CourseCardProps) {
  const soldOut = course.availableSlots != null && course.availableSlots <= 0;
  const notYetOpen = course.saleState === 'notYetOpen';
  const saleClosed = course.saleState === 'closed';
  const interactionDisabled = disabled || soldOut || notYetOpen || saleClosed;
  const openDate = notYetOpen ? fmtShortDate(course.saleOpenAt) : '';

  return (
    <Pressable
      onPress={interactionDisabled ? undefined : onPress}
      accessibilityRole={asRadio ? 'radio' : 'button'}
      accessibilityState={{ checked: selected, disabled: interactionDisabled }}
      accessibilityLabel={`Cự ly ${course.distance}, ${fmtVnd(course.price)}${soldOut ? ', hết vé' : ''}${notYetOpen ? ', chưa mở bán' : ''}${saleClosed ? ', đã đóng bán' : ''}`}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] }}>
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
          {course.tierName ? (
            <Badge variant="brand">{course.tierName}</Badge>
          ) : null}
        </View>
        <Text style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral600 }}>
          {fmtVnd(course.price)}
          {course.availableSlots != null ? ` · Còn ${course.availableSlots} vé` : ''}
        </Text>
        {notYetOpen && openDate ? (
          <Text style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.warning }}>
            Mở bán: {openDate}
          </Text>
        ) : null}
      </View>
      {soldOut && <Badge variant="default">Hết vé</Badge>}
      {notYetOpen && <Badge variant="warning">Chưa mở</Badge>}
      {saleClosed && <Badge variant="default">Đã đóng</Badge>}
    </Pressable>
  );
}
