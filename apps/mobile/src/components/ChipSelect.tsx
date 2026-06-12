/**
 * apps/mobile/src/components/ChipSelect.tsx
 *
 * Single-select chip row — wrapping pills for small closed option sets
 * (shirt sizes from race config, guardian relation). Mirrors Input's
 * label/required/error visual contract so it slots into the same forms.
 *
 * Web parity: web renders these as React-Select dropdowns; on mobile a
 * wrapping chip grid is faster for ≤15 options and avoids RN Modal
 * (see F28 — modals fight the router on deep links).
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { tokens } from '../theme/tokens';

export interface ChipOption {
  value: string;
  /** Display label — falls back to `value`. */
  label?: string;
}

export interface ChipSelectProps {
  label?: string;
  required?: boolean;
  options: ReadonlyArray<ChipOption | string>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
  /** Disable all interaction (e.g. racekit locked after registration). */
  readOnly?: boolean;
}

export function ChipSelect({
  label,
  required,
  options,
  value,
  onChange,
  error,
  helper,
  readOnly,
}: ChipSelectProps) {
  const opts: ChipOption[] = options.map((o) =>
    typeof o === 'string' ? { value: o } : o,
  );
  // Case/whitespace-insensitive matching: legacy free-text values ("m ",
  // "xl") must select their canonical option instead of spawning a phantom
  // duplicate chip next to it.
  const norm = (s: string) => s.trim().toUpperCase();
  const matched = value ? opts.find((o) => norm(o.value) === norm(value)) : undefined;
  // A stored value outside the configured set (athlete registered before the
  // organizer trimmed the size list, custom sizes like "VL") must still be
  // visible & selected — prepend it instead of silently dropping it.
  if (value && !matched) {
    opts.unshift({ value: value.trim() || value });
  }
  const selectedValue = matched ? matched.value : value.trim() || value;
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
              *
            </Text>
          )}
        </View>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] }}>
        {opts.map((o) => {
          const selected = selectedValue === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={readOnly ? undefined : () => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: readOnly }}
              accessibilityLabel={o.label ?? o.value}
              style={{
                paddingHorizontal: tokens.space[3],
                paddingVertical: tokens.space[2],
                borderRadius: tokens.radius.full,
                borderWidth: 1,
                borderColor: selected
                  ? tokens.color.brandPrimary
                  : tokens.color.neutral300,
                backgroundColor: selected
                  ? tokens.color.brandPrimaryLight
                  : tokens.color.surfaceCard,
                opacity: readOnly && !selected ? 0.5 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: tokens.fontSize.bodySm,
                  fontWeight: selected
                    ? tokens.fontWeight.semibold
                    : tokens.fontWeight.regular,
                  color: selected
                    ? tokens.color.brandPrimary
                    : tokens.color.neutral700,
                }}
              >
                {o.label ?? o.value}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {(error || helper) && (
        <Text
          style={{
            marginTop: tokens.space[1],
            fontSize: tokens.fontSize.labelSm,
            color: error ? tokens.color.error : tokens.color.neutral500,
          }}
        >
          {error || helper}
        </Text>
      )}
    </View>
  );
}
