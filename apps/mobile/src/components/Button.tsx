/**
 * apps/mobile/src/components/Button.tsx
 *
 * Spec: design-system #1
 * Variants: primary | secondary | outline | ghost | destructive
 * Sizes: sm | md | lg | xl
 * States: default | pressed | disabled | loading
 */

import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Button as TButton, styled, GetProps, Stack, Text } from 'tamagui';
import { tokens } from '../theme/tokens';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<Size, { height: number; px: number; fontSize: number; iconSize: number }> = {
  sm: { height: 32, px: tokens.space[3], fontSize: tokens.fontSize.labelSm, iconSize: tokens.iconSize.sm },
  md: { height: 40, px: tokens.space[4], fontSize: tokens.fontSize.labelMd, iconSize: tokens.iconSize.md },
  lg: { height: 48, px: tokens.space[5], fontSize: tokens.fontSize.labelLg, iconSize: tokens.iconSize.md },
  xl: { height: 56, px: tokens.space[6], fontSize: tokens.fontSize.labelLg, iconSize: tokens.iconSize.lg },
};

const VARIANT_STYLES: Record<
  Variant,
  { bg: string; bgPressed: string; bgDisabled: string; fg: string; fgDisabled: string; border?: string }
> = {
  primary: {
    bg: tokens.color.brandPrimary,
    bgPressed: tokens.color.brandPrimaryDark,
    bgDisabled: tokens.color.neutral200,
    fg: tokens.color.neutral0,
    fgDisabled: tokens.color.neutral400,
  },
  secondary: {
    bg: tokens.color.neutral100,
    bgPressed: tokens.color.neutral200,
    bgDisabled: tokens.color.neutral50,
    fg: tokens.color.neutral900,
    fgDisabled: tokens.color.neutral400,
  },
  outline: {
    bg: 'transparent',
    bgPressed: tokens.color.neutral50,
    bgDisabled: 'transparent',
    fg: tokens.color.neutral900,
    fgDisabled: tokens.color.neutral400,
    border: tokens.color.neutral300,
  },
  ghost: {
    bg: 'transparent',
    bgPressed: tokens.color.neutral50,
    bgDisabled: 'transparent',
    fg: tokens.color.brandPrimary,
    fgDisabled: tokens.color.neutral400,
  },
  destructive: {
    bg: tokens.color.error,
    bgPressed: '#DC2626',
    bgDisabled: tokens.color.neutral200,
    fg: tokens.color.neutral0,
    fgDisabled: tokens.color.neutral400,
  },
};

export interface ButtonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPress?: () => void;
  children?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  disabled,
  leftIcon,
  rightIcon,
  onPress,
  children,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  // Defensive: caller may pass aliased variant ('tertiary' / 'danger' from
  // StatusActionButtons). Fall back to primary if unknown.
  const variantAliases: Record<string, Variant> = {
    tertiary: 'ghost',
    danger: 'destructive',
  };
  const resolvedVariant: Variant =
    VARIANT_STYLES[variant as Variant] != null
      ? (variant as Variant)
      : (variantAliases[variant as string] ?? 'primary');
  const v = VARIANT_STYLES[resolvedVariant] ?? VARIANT_STYLES.primary;
  const s = SIZE_MAP[size];
  const isDisabled = disabled || loading;

  return (
    <TButton
      unstyled
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      backgroundColor={isDisabled ? v.bgDisabled : v.bg}
      pressStyle={{ backgroundColor: v.bgPressed, opacity: 0.95, translateY: 1 }}
      borderRadius={tokens.radius.lg}
      borderWidth={v.border ? 1 : 0}
      borderColor={v.border}
      height={s.height}
      minHeight={tokens.touchTarget.minIOS}
      paddingHorizontal={s.px}
      width={fullWidth ? '100%' : undefined}
      alignSelf={fullWidth ? 'stretch' : 'flex-start'}
      flexDirection="row"
      alignItems="center"
      justifyContent="center"
      gap={tokens.space[2]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isDisabled ? v.fgDisabled : v.fg} />
      ) : (
        leftIcon
      )}
      {children != null && (
        <Text
          color={isDisabled ? v.fgDisabled : v.fg}
          fontSize={s.fontSize}
          fontWeight={tokens.fontWeight.semibold}
          numberOfLines={1}
        >
          {children}
        </Text>
      )}
      {!loading && rightIcon}
    </TButton>
  );
}
