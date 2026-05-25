/**
 * apps/mobile/src/components/OTPInput.tsx
 *
 * Spec: design-system #3 — 6-digit OTP
 * Auto-advance focus, paste-friendly, iOS SMS autofill (textContentType="oneTimeCode")
 * States: empty | filled | focused | error | success
 */

import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput, Pressable, Platform } from 'react-native';
import { tokens } from '../theme/tokens';

export interface OTPInputProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  error?: boolean;
  success?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  onComplete?: (v: string) => void;
  accessibilityLabel?: string;
}

export function OTPInput({
  value,
  onChange,
  length = 6,
  error,
  success,
  disabled,
  autoFocus = true,
  onComplete,
  accessibilityLabel,
}: OTPInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (value.length === length && onComplete) onComplete(value);
  }, [value, length, onComplete]);

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');
  const focusIndex = Math.min(value.length, length - 1);

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="none"
      accessibilityLabel={accessibilityLabel ?? `Nhập mã OTP ${length} chữ số`}
    >
      <View style={{ flexDirection: 'row', gap: tokens.space[2], justifyContent: 'center' }}>
        {digits.map((d, i) => {
          const isFocused = focused && i === focusIndex;
          const borderColor = error
            ? tokens.color.error
            : success
            ? tokens.color.success
            : isFocused
            ? tokens.color.brandPrimary
            : tokens.color.neutral300;
          return (
            <View
              key={i}
              style={{
                width: 48,
                height: 56,
                borderWidth: isFocused || error || success ? 2 : 1,
                borderColor,
                borderRadius: tokens.radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: disabled ? tokens.color.neutral100 : tokens.color.surfaceBg,
              }}
            >
              <View
                style={{
                  fontSize: tokens.fontSize.displayMd,
                  fontWeight: tokens.fontWeight.bold,
                } as any}
              >
                {/* Native Text */}
                <RNDigit char={d} />
              </View>
            </View>
          );
        })}
      </View>

      {/* Hidden controller input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => {
          const cleaned = t.replace(/[^0-9]/g, '').slice(0, length);
          onChange(cleaned);
        }}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType={Platform.OS === 'ios' ? 'oneTimeCode' : 'none'}
        autoComplete="sms-otp"
        editable={!disabled}
        maxLength={length}
        caretHidden
        style={{
          position: 'absolute',
          opacity: 0,
          height: 1,
          width: 1,
        }}
      />
    </Pressable>
  );
}

// Tiny helper to render single digit text — kept colocated so OTPInput is self-contained
import { Text as RNText } from 'react-native';
function RNDigit({ char }: { char: string }) {
  return (
    <RNText
      style={{
        fontSize: tokens.fontSize.displayMd,
        fontWeight: tokens.fontWeight.bold as any,
        color: tokens.color.neutral900,
      }}
    >
      {char}
    </RNText>
  );
}
