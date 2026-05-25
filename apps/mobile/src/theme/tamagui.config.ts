/**
 * apps/mobile/src/theme/tamagui.config.ts
 *
 * Tamagui v1 config. Phase 1 = light only (BR-GLOBAL: dark mode defer Phase 2).
 */

import { createTamagui, createTokens } from 'tamagui';
import { createInterFont } from '@tamagui/font-inter';
import { shorthands } from '@tamagui/shorthands';
import { tokens as t } from './tokens';

const headingFont = createInterFont({
  size: {
    1: t.fontSize.bodySm,
    2: t.fontSize.bodyMd,
    3: t.fontSize.bodyLg,
    4: t.fontSize.h4,
    5: t.fontSize.h3,
    6: t.fontSize.h2,
    7: t.fontSize.h1,
    8: t.fontSize.displayMd,
    9: t.fontSize.displayLg,
  },
  lineHeight: {
    1: t.lineHeight.bodySm,
    2: t.lineHeight.bodyMd,
    3: t.lineHeight.bodyLg,
    4: t.lineHeight.h4,
    5: t.lineHeight.h3,
    6: t.lineHeight.h2,
    7: t.lineHeight.h1,
    8: t.lineHeight.displayMd,
    9: t.lineHeight.displayLg,
  },
  weight: {
    4: t.fontWeight.regular,
    5: t.fontWeight.medium,
    6: t.fontWeight.semibold,
    7: t.fontWeight.bold,
  },
});

const bodyFont = createInterFont({
  size: {
    1: t.fontSize.bodySm,
    2: t.fontSize.bodyMd,
    3: t.fontSize.bodyLg,
    4: t.fontSize.h4,
  },
  weight: {
    4: t.fontWeight.regular,
    5: t.fontWeight.medium,
    6: t.fontWeight.semibold,
    7: t.fontWeight.bold,
  },
});

const tokens = createTokens({
  color: {
    // brand
    brandPrimary: t.color.brandPrimary,
    brandPrimaryDark: t.color.brandPrimaryDark,
    brandPrimaryLight: t.color.brandPrimaryLight,
    brandSecondary: t.color.brandSecondary,
    brandAccent: t.color.brandAccent,
    magenta: t.color.magenta,

    // semantic
    success: t.color.success,
    successBg: t.color.successBg,
    warning: t.color.warning,
    warningBg: t.color.warningBg,
    error: t.color.error,
    errorBg: t.color.errorBg,
    info: t.color.info,
    infoBg: t.color.infoBg,

    // neutrals
    neutral0: t.color.neutral0,
    neutral50: t.color.neutral50,
    neutral100: t.color.neutral100,
    neutral200: t.color.neutral200,
    neutral300: t.color.neutral300,
    neutral400: t.color.neutral400,
    neutral500: t.color.neutral500,
    neutral600: t.color.neutral600,
    neutral700: t.color.neutral700,
    neutral800: t.color.neutral800,
    neutral900: t.color.neutral900,
    neutralBlack: t.color.neutralBlack,

    // surfaces
    surfaceBg: t.color.surfaceBg,
    surfaceCard: t.color.surfaceCard,
    surfaceElevated: t.color.surfaceElevated,
    surfaceOverlay: t.color.surfaceOverlay,
  },
  space: {
    0: t.space[0],
    1: t.space[1],
    2: t.space[2],
    3: t.space[3],
    4: t.space[4],
    5: t.space[5],
    6: t.space[6],
    7: t.space[7],
    8: t.space[8],
    9: t.space[9],
    10: t.space[10],
    true: t.space[4],
  },
  size: {
    0: t.space[0],
    1: t.space[1],
    2: t.space[2],
    3: t.space[3],
    4: t.space[4],
    5: t.space[5],
    6: t.space[6],
    7: t.space[7],
    8: t.space[8],
    9: t.space[9],
    10: t.space[10],
    true: t.space[4],
  },
  radius: {
    0: t.radius.none,
    sm: t.radius.sm,
    md: t.radius.md,
    lg: t.radius.lg,
    xl: t.radius.xl,
    '2xl': t.radius['2xl'],
    full: t.radius.full,
    true: t.radius.md,
  },
  zIndex: {
    0: 0,
    1: 10,
    2: 100,
    3: 1000,
    4: 10000,
  },
});

const lightTheme = {
  // semantic — for `<Text color="$text">` style consumption
  background: tokens.color.surfaceBg,
  card: tokens.color.surfaceCard,
  text: tokens.color.neutral900,
  textSecondary: tokens.color.neutral600,
  textTertiary: tokens.color.neutral400,
  border: tokens.color.neutral200,
  borderStrong: tokens.color.neutral300,
  primary: tokens.color.brandPrimary,
  primaryPressed: tokens.color.brandPrimaryDark,
  primaryLight: tokens.color.brandPrimaryLight,
  destructive: tokens.color.error,
  // pass through for `$success`, `$warning`, …
  success: tokens.color.success,
  warning: tokens.color.warning,
  error: tokens.color.error,
  info: tokens.color.info,
};

export const tamaguiConfig = createTamagui({
  defaultFont: 'body',
  shouldAddPrefersColorThemes: false, // Phase 1 light only
  themeClassNameOnRoot: false,
  fonts: {
    heading: headingFont,
    body: bodyFont,
    mono: bodyFont, // simplified; swap for JetBrains Mono in Phase 2
  },
  tokens,
  themes: {
    light: lightTheme,
  },
  shorthands,
  media: {
    sm: { maxWidth: 640 },
    md: { maxWidth: 768 },
    lg: { maxWidth: 1024 },
    short: { maxHeight: 700 },
    tall: { minHeight: 701 },
  },
});

export type AppConfig = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
