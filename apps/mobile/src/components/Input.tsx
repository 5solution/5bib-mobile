/**
 * apps/mobile/src/components/Input.tsx
 *
 * Spec: design-system #2
 * Variants: text | password | email | phone | number | search | textarea
 * States: default | focused | filled | error | disabled | read-only
 */

import React, { useState, forwardRef } from 'react';
import { TextInput, View, Text, Pressable, TextInputProps as RNTextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../theme/tokens';

type Variant = 'text' | 'password' | 'email' | 'phone' | 'number' | 'search' | 'textarea';

export interface InputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  variant?: Variant;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  prefix?: string;
  suffix?: string;
  readOnly?: boolean;
  charCounter?: boolean;
  maxLength?: number;
  onClear?: () => void;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    required,
    helper,
    error,
    variant = 'text',
    leftIcon,
    rightIcon,
    prefix,
    suffix,
    readOnly,
    charCounter,
    maxLength,
    onClear,
    onFocus,
    onBlur,
    value,
    accessibilityLabel,
    accessibilityHint,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const isError = !!error;
  const isPwd = variant === 'password';
  const isTextarea = variant === 'textarea';
  const isSearch = variant === 'search';
  const isPhone = variant === 'phone';
  const disabled = rest.editable === false;

  const borderColor = isError
    ? tokens.color.error
    : focused
    ? tokens.color.brandPrimary
    : readOnly
    ? 'transparent'
    : disabled
    ? tokens.color.neutral200
    : tokens.color.neutral300;

  const bg = readOnly
    ? tokens.color.neutral50
    : disabled
    ? tokens.color.neutral100
    : tokens.color.surfaceBg;

  const keyboardType =
    variant === 'email'
      ? 'email-address'
      : variant === 'phone'
      ? 'phone-pad'
      : variant === 'number'
      ? 'numeric'
      : 'default';

  return (
    <View>
      {label && (
        <View style={{ flexDirection: 'row', marginBottom: tokens.space[1] }}>
          <Text
            style={{
              fontSize: tokens.fontSize.labelMd,
              fontWeight: tokens.fontWeight.semibold,
              color: tokens.color.neutral700,
            }}
          >
            {label}
          </Text>
          {required && (
            <Text
              style={{
                fontSize: tokens.fontSize.labelMd,
                color: tokens.color.error,
                marginLeft: 2,
              }}
              accessibilityLabel="bắt buộc"
            >
              {' '}
              *
            </Text>
          )}
        </View>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: isTextarea ? 'flex-start' : 'center',
          backgroundColor: bg,
          borderWidth: focused && !isError ? 2 : 1,
          borderColor,
          borderRadius: tokens.radius.md,
          paddingHorizontal: tokens.space[3],
          minHeight: isTextarea ? 80 : 48,
          paddingVertical: isTextarea ? tokens.space[3] : 0,
          gap: tokens.space[2],
        }}
      >
        {leftIcon}
        {isSearch && !leftIcon && (
          <Ionicons
            name="search-outline"
            size={18}
            color={tokens.color.neutral500}
            accessibilityElementsHidden
          />
        )}
        {isPhone && (
          <Text
            style={{
              color: tokens.color.neutral600,
              fontSize: tokens.fontSize.bodyLg,
            }}
          >
            +84
          </Text>
        )}
        {prefix && (
          <Text
            style={{ color: tokens.color.neutral600, fontSize: tokens.fontSize.bodyLg }}
          >
            {prefix}
          </Text>
        )}

        <TextInput
          ref={ref}
          value={value}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          editable={!readOnly && !disabled}
          secureTextEntry={isPwd && !showPwd}
          keyboardType={keyboardType}
          autoCapitalize={variant === 'email' || isPwd ? 'none' : rest.autoCapitalize}
          autoCorrect={variant === 'email' || isPwd ? false : rest.autoCorrect}
          multiline={isTextarea}
          numberOfLines={isTextarea ? 4 : 1}
          maxLength={maxLength}
          placeholderTextColor={tokens.color.neutral400}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled, selected: focused }}
          style={{
            flex: 1,
            color: disabled ? tokens.color.neutral400 : tokens.color.neutral900,
            fontSize: tokens.fontSize.bodyLg,
            paddingVertical: 0,
            textAlignVertical: isTextarea ? 'top' : 'center',
            minHeight: isTextarea ? 60 : 24,
          }}
          {...rest}
        />

        {suffix && (
          <Text style={{ color: tokens.color.neutral600, fontSize: tokens.fontSize.bodyLg }}>
            {suffix}
          </Text>
        )}

        {isPwd && (
          <Pressable
            onPress={() => setShowPwd((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            hitSlop={8}
          >
            <Ionicons
              name={showPwd ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={tokens.color.neutral600}
            />
          </Pressable>
        )}

        {(isSearch || onClear) && !!value && (
          <Pressable
            onPress={onClear}
            accessibilityRole="button"
            accessibilityLabel="Xoá"
            hitSlop={8}
          >
            <Text style={{ color: tokens.color.neutral500, fontSize: 18 }}>✕</Text>
          </Pressable>
        )}

        {rightIcon}
      </View>

      {(helper || error || (charCounter && maxLength)) && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: tokens.space[1],
          }}
        >
          <Text
            style={{
              fontSize: tokens.fontSize.bodySm,
              color: isError ? tokens.color.error : tokens.color.neutral600,
              flex: 1,
            }}
          >
            {error || helper || ''}
          </Text>
          {charCounter && maxLength && (
            <Text style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral500 }}>
              {String(value ?? '').length}/{maxLength}
            </Text>
          )}
        </View>
      )}
    </View>
  );
});
