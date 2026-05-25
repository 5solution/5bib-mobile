/**
 * apps/mobile/src/components/domain/VATToggleSection.tsx
 *
 * Component-16 — VAT invoice toggle + 6 conditional fields.
 *
 * Reference: 01-ba-prd-epic-3-checkout.md rev2 — BR-CHECKOUT VAT section
 *
 * Behavior:
 *   - Checkbox "Lấy hoá đơn VAT" + helper text
 *   - Toggle expands 6 form fields with 300ms animation
 *   - Fields: company_name, tax (MST regex), company_address, company_receiver_name,
 *     company_phone, company_email
 *   - Integrates with react-hook-form via FormProvider context (useFormContext)
 *
 * Animation respects prefersReducedMotion (snaps instantly if true).
 *
 * MST (Mã số thuế) regex: 10 digits OR 10 digits + "-" + 3 digits.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, AccessibilityInfo, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useFormContext, Controller } from 'react-hook-form';
import { tokens } from '../../theme/tokens';
import { Input } from '../Input';

// Enable LayoutAnimation on Android.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** MST validation regex — BR-CHECKOUT VAT. */
export const MST_REGEX = /^\d{10}(-\d{3})?$/;

export interface VATFormFields {
  vat_enabled: boolean;
  company_name?: string;
  tax?: string;
  company_address?: string;
  company_receiver_name?: string;
  company_phone?: string;
  company_email?: string;
}

export interface VATToggleSectionProps {
  /** Optional override for the toggle field name (default `vat_enabled`). */
  toggleFieldName?: string;
}

export function VATToggleSection({ toggleFieldName = 'vat_enabled' }: VATToggleSectionProps) {
  const { control, watch, formState: { errors } } = useFormContext<VATFormFields & Record<string, any>>();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
  }, []);

  const enabled = !!watch(toggleFieldName as any);

  // Trigger layout animation on toggle (respects reduced motion).
  useEffect(() => {
    if (reducedMotion) return;
    LayoutAnimation.configureNext(
      LayoutAnimation.create(tokens.duration.normal, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity),
    );
  }, [enabled, reducedMotion]);

  const err = (k: string) => (errors as any)?.[k]?.message as string | undefined;

  return (
    <View style={{ gap: tokens.space[3] }}>
      {/* Checkbox + label */}
      <Controller
        control={control}
        name={toggleFieldName as any}
        render={({ field: { onChange, value } }) => (
          <Pressable
            onPress={() => onChange(!value)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!value }}
            accessibilityLabel="Lấy hoá đơn VAT"
            hitSlop={8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: tokens.space[2],
              minHeight: tokens.touchTarget.minIOS,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: tokens.radius.sm,
                borderWidth: 2,
                borderColor: value ? tokens.color.brandPrimary : tokens.color.neutral400,
                backgroundColor: value ? tokens.color.brandPrimary : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {value && (
                <Text style={{ color: tokens.color.neutral0, fontSize: 14, fontWeight: '700' }}>✓</Text>
              )}
            </View>
            <Text
              style={{
                fontSize: tokens.fontSize.bodyLg,
                fontWeight: tokens.fontWeight.semibold,
                color: tokens.color.neutral900,
              }}
            >
              Lấy hoá đơn VAT
            </Text>
          </Pressable>
        )}
      />
      <Text style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral600, marginTop: -tokens.space[1] }}>
        Đánh dấu nếu bạn cần xuất hoá đơn VAT cho công ty.
      </Text>

      {/* Conditional 6 fields */}
      {enabled && (
        <View style={{ gap: tokens.space[3], marginTop: tokens.space[2] }}>
          <Controller
            control={control}
            name={'company_name' as any}
            rules={{ required: enabled ? 'Vui lòng nhập tên công ty' : false }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Tên công ty"
                required
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                error={err('company_name')}
                placeholder="VD: Công ty TNHH ABC"
              />
            )}
          />
          <Controller
            control={control}
            name={'tax' as any}
            rules={{
              required: enabled ? 'Vui lòng nhập mã số thuế' : false,
              pattern: { value: MST_REGEX, message: 'MST không hợp lệ (10 hoặc 10-3 chữ số)' },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Mã số thuế (MST)"
                required
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                error={err('tax')}
                variant="number"
                placeholder="VD: 0123456789 hoặc 0123456789-001"
                helper="Định dạng: 10 chữ số hoặc 10-3 chữ số"
              />
            )}
          />
          <Controller
            control={control}
            name={'company_address' as any}
            rules={{ required: enabled ? 'Vui lòng nhập địa chỉ' : false }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Địa chỉ công ty"
                required
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                error={err('company_address')}
                variant="textarea"
              />
            )}
          />
          <Controller
            control={control}
            name={'company_receiver_name' as any}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Người nhận hoá đơn"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                error={err('company_receiver_name')}
              />
            )}
          />
          <Controller
            control={control}
            name={'company_phone' as any}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Số điện thoại"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                error={err('company_phone')}
                variant="phone"
              />
            )}
          />
          <Controller
            control={control}
            name={'company_email' as any}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email nhận hoá đơn"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                error={err('company_email')}
                variant="email"
              />
            )}
          />
        </View>
      )}
    </View>
  );
}
