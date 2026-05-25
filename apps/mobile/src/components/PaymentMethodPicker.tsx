/**
 * apps/mobile/src/components/PaymentMethodPicker.tsx
 *
 * Spec: design-system #17
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { tokens } from '../theme/tokens';

export type PaymentMethodId =
  | 'PAYX_QR'
  | 'VNPAY_QR'
  | 'PAYX_ATM'
  | 'NAPAS'
  | 'VISA_VNPAY'
  | 'ONEPAY_INTL'
  | 'PAYOO_WALLET';

export interface PaymentMethodOption {
  id: PaymentMethodId;
  /** Group title (e.g. "Khuyến nghị", "Thẻ ngân hàng", "Ví điện tử") */
  group?: string;
  label: string;
  description?: string;
  /** SVG logo node — designer-provided. Fallback: small text chip. */
  logo?: React.ReactNode;
  logoText?: string;
}

export interface PaymentMethodPickerProps {
  options: PaymentMethodOption[];
  value: PaymentMethodId | null;
  onChange: (id: PaymentMethodId) => void;
}

export function PaymentMethodPicker({ options, value, onChange }: PaymentMethodPickerProps) {
  // group by `group` key, preserving order
  const groups: { name?: string; items: PaymentMethodOption[] }[] = [];
  for (const opt of options) {
    let g = groups.find((x) => x.name === opt.group);
    if (!g) {
      g = { name: opt.group, items: [] };
      groups.push(g);
    }
    g.items.push(opt);
  }

  return (
    <View style={{ gap: tokens.space[4] }} accessibilityRole="radiogroup">
      {groups.map((g, gi) => (
        <View key={gi} style={{ gap: tokens.space[2] }}>
          {g.name && (
            <Text
              style={{
                fontSize: tokens.fontSize.labelSm,
                fontWeight: tokens.fontWeight.semibold,
                color: tokens.color.neutral500,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {g.name}
            </Text>
          )}
          {g.items.map((opt) => {
            const selected = value === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => onChange(opt.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={opt.label}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: tokens.space[3],
                  gap: tokens.space[3],
                  borderRadius: tokens.radius.lg,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? tokens.color.brandPrimary : tokens.color.neutral200,
                  backgroundColor: selected
                    ? tokens.color.brandPrimaryLight
                    : pressed
                    ? tokens.color.neutral50
                    : tokens.color.surfaceCard,
                  minHeight: 56,
                })}
              >
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
                {opt.logo ?? (
                  <View
                    style={{
                      width: 48,
                      height: 32,
                      borderRadius: tokens.radius.sm,
                      backgroundColor: tokens.color.neutral100,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: tokens.fontWeight.bold,
                        color: tokens.color.neutral700,
                      }}
                    >
                      {opt.logoText ?? opt.id.slice(0, 4)}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: tokens.fontSize.bodyLg,
                      fontWeight: tokens.fontWeight.medium,
                      color: tokens.color.neutral900,
                    }}
                  >
                    {opt.label}
                  </Text>
                  {opt.description && (
                    <Text
                      style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral500 }}
                    >
                      {opt.description}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
