/**
 * apps/mobile/src/theme/tokens.ts
 *
 * Design tokens for 5BIB mobile app — source of truth for Tamagui theme.
 *
 * Reference: 01-ba-prd-design-system.md (FEATURE-003 Wave 1)
 *
 * NEVER hardcode color / spacing / radius / font-size in screens or components.
 * Always reference via theme tokens (Tamagui `$` notation) or via `tokens.*`.
 */

// ---------------------------------------------------------------------------
// COLORS
// ---------------------------------------------------------------------------

export const palette = {
  // Brand — locked to the OFFICIAL logo palette 2026-06-11 (Danny delivered
  // the real wordmark; path data in src/components/BrandLogo.tsx).
  // #2563EB = the logo blue (Tailwind blue-600, same as web). The old
  // #0066FF was a pre-logo placeholder that made every CTA subtly off-brand.
  brandPrimary: '#2563EB',
  brandPrimaryDark: '#1D4ED8',
  brandPrimaryLight: '#DBEAFE',
  brandSecondary: '#FF6B35',
  brandAccent: '#FFB800',

  // Semantic
  success: '#10B981',
  successBg: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  error: '#EF4444',
  errorBg: '#FEF2F2',
  info: '#3B82F6',
  infoBg: '#EFF6FF',

  // Neutrals (cool grayscale)
  neutral0: '#FFFFFF',
  neutral50: '#F9FAFB',
  neutral100: '#F3F4F6',
  neutral200: '#E5E7EB',
  neutral300: '#D1D5DB',
  neutral400: '#9CA3AF',
  neutral500: '#6B7280',
  neutral600: '#4B5563',
  neutral700: '#374151',
  neutral800: '#1F2937',
  neutral900: '#111827',
  neutralBlack: '#000000',

  // Surfaces
  surfaceBg: '#FFFFFF',
  surfaceCard: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceOverlay: 'rgba(0,0,0,0.5)',

  // Race-day accent — the official logo's pink flag (#F30C60). Used
  // sparingly: LIVE state, the BIB-flag wink, hover flash.
  magenta: '#F30C60',
} as const;

// ---------------------------------------------------------------------------
// SPACING — 4pt grid
// ---------------------------------------------------------------------------

export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  10: 64,
} as const;

// ---------------------------------------------------------------------------
// RADIUS
// ---------------------------------------------------------------------------

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// TYPOGRAPHY
// ---------------------------------------------------------------------------

export const fonts = {
  body: { ios: 'System', android: 'Roboto', default: 'System' },
  heading: { ios: 'System', android: 'Roboto', default: 'System' },
  mono: { ios: 'Menlo', android: 'monospace', default: 'monospace' },
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const fontSize = {
  // Display
  displayLg: 32,
  displayMd: 28,
  // Headings
  h1: 24,
  h2: 20,
  h3: 18,
  h4: 16,
  // Body
  bodyLg: 16,
  bodyMd: 14,
  bodySm: 12,
  // Labels (buttons, badges)
  labelLg: 16,
  labelMd: 14,
  labelSm: 12,
  // Mono
  monoMd: 14,
} as const;

export const lineHeight = {
  displayLg: 40,
  displayMd: 36,
  h1: 32,
  h2: 28,
  h3: 26,
  h4: 24,
  bodyLg: 24,
  bodyMd: 22,
  bodySm: 18,
  labelLg: 20,
  labelMd: 18,
  labelSm: 16,
  monoMd: 20,
} as const;

// ---------------------------------------------------------------------------
// ELEVATION / SHADOW
// ---------------------------------------------------------------------------

export const elevation = {
  0: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  1: {
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  2: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  3: {
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  4: {
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
} as const;

// ---------------------------------------------------------------------------
// ICON SIZES
// ---------------------------------------------------------------------------

export const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

// ---------------------------------------------------------------------------
// MOTION
// ---------------------------------------------------------------------------

export const duration = {
  fast: 150,
  normal: 280,
  slow: 500,
} as const;

export const easing = {
  // RN Reanimated / Animated.timing easing strings — adapt at use site
  outExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ---------------------------------------------------------------------------
// TOUCH TARGETS (Apple HIG / Material) — BR-GLOBAL-13
// ---------------------------------------------------------------------------

export const touchTarget = {
  minIOS: 44,
  minAndroid: 48,
} as const;

// ---------------------------------------------------------------------------
// LAYOUT
// ---------------------------------------------------------------------------

export const layout = {
  screenPaddingH: space[4],          // 16
  cardPadding: space[4],
  sectionGap: space[6],              // 24
  formFieldGap: space[4],
  headerHeight: 56,                  // + safe area top
  tabBarHeight: 56,                  // + safe area bottom
  containerMax: 600,                 // tablet center (Phase 2)
} as const;

// ---------------------------------------------------------------------------
// AGGREGATE EXPORT
// ---------------------------------------------------------------------------

export const tokens = {
  color: palette,
  space,
  radius,
  fonts,
  fontSize,
  fontWeight,
  lineHeight,
  elevation,
  iconSize,
  duration,
  easing,
  touchTarget,
  layout,
} as const;

export type Tokens = typeof tokens;
export type ColorToken = keyof typeof palette;
export type SpaceToken = keyof typeof space;
export type RadiusToken = keyof typeof radius;
