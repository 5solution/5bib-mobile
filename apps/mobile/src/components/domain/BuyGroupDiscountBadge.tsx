/**
 * apps/mobile/src/components/domain/BuyGroupDiscountBadge.tsx
 *
 * Component-17 — Buy-group tier discount badge (EPIC-3 rev2).
 *
 * Reference: 01-ba-prd-epic-3-checkout.md rev2 — Buy-group discount tier
 *
 * Format: "🎉 Tiết kiệm {Y}đ khi mua ≥{N} vé"
 * Background: brand.accent 10% alpha
 * Tap → open BottomSheet "Cách tính giảm giá nhóm" with explanation.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../../theme/tokens';
import { BottomSheet } from '../BottomSheet';

export interface BuyGroupDiscountBadgeProps {
  /** Total VND saved with current tier. */
  discountAmount: number;
  /** Minimum quantity required for the tier. */
  minQuantity: number;
  /** Percent off (informational, for sheet). */
  percent?: number;
  style?: StyleProp<ViewStyle>;
}

function fmtVND(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('vi-VN').format(Math.round(v)) + 'đ';
}

/** Convert hex `#RRGGBB` to `rgba(r,g,b,a)` for tint surface. Defensive — falls back
 *  to grey rgba if hex malformed (avoids NaN in rgba string crashing RN style parser). */
function hexAlpha(hex: string, alpha: number): string {
  const h = (hex ?? '').replace('#', '');
  if (h.length < 6) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
    return `rgba(0,0,0,${alpha})`;
  }
  return `rgba(${r},${g},${b},${alpha})`;
}

export function BuyGroupDiscountBadge({
  discountAmount,
  minQuantity,
  percent,
  style,
}: BuyGroupDiscountBadgeProps) {
  const [open, setOpen] = useState(false);
  const label = `Tiết kiệm ${fmtVND(discountAmount)} khi mua ≥${minQuantity} vé`;
  const bg = hexAlpha(tokens.color.brandAccent, 0.1);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Bấm để xem cách tính giảm giá nhóm"
        style={[
          {
            backgroundColor: bg,
            borderColor: tokens.color.brandAccent,
            borderWidth: 1,
            borderRadius: tokens.radius.md,
            paddingHorizontal: tokens.space[3],
            paddingVertical: tokens.space[2],
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: tokens.space[2],
            minHeight: tokens.touchTarget.minIOS,
          },
          style,
        ]}
      >
        <Ionicons name="gift-outline" size={16} color={tokens.color.brandAccent} />
        <Text
          style={{
            color: tokens.color.neutral900,
            fontSize: tokens.fontSize.labelMd,
            fontWeight: tokens.fontWeight.semibold,
            flex: 1,
          }}
          numberOfLines={2}
        >
          {label}
        </Text>
        <Ionicons
          name="information-circle-outline"
          size={16}
          color={tokens.color.neutral600}
        />
      </Pressable>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Cách tính giảm giá nhóm"
        snapPoints={['40%']}
        showClose
      >
        <View style={{ gap: tokens.space[3] }}>
          <Text style={{ fontSize: tokens.fontSize.bodyLg, color: tokens.color.neutral800, lineHeight: tokens.lineHeight.bodyLg }}>
            Khi mua từ <Text style={{ fontWeight: tokens.fontWeight.bold }}>{minQuantity} vé trở lên</Text> trong cùng đơn hàng,
            bạn sẽ được giảm tự động {percent ? `${percent}%` : 'theo tier'} trên tổng giá vé (chưa gồm phí dịch vụ).
          </Text>
          <Text style={{ fontSize: tokens.fontSize.bodyMd, color: tokens.color.neutral600 }}>
            Khoản tiết kiệm hiện tại:{' '}
            <Text style={{ color: tokens.color.brandAccent, fontWeight: tokens.fontWeight.bold }}>
              {fmtVND(discountAmount)}
            </Text>
          </Text>
          <Text style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral500 }}>
            * Chiết khấu chỉ áp dụng cho vé cùng cự ly và cùng giải. Không cộng dồn với voucher khác.
          </Text>
        </View>
      </BottomSheet>
    </>
  );
}
