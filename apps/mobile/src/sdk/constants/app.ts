/**
 * apps/mobile/src/sdk/constants/app.ts
 *
 * App-wide constants: animations, aspect ratios, modal sizing.
 * Consumed by Tamagui themes + screen layouts.
 *
 * Source: 01-ba-prd-design-system.md (motion + sizing tokens)
 */

/** Animation durations in ms (matches Tamagui motion preset). */
export const ANIMATION = {
  /** Tap feedback, micro-interactions. */
  FAST: 120,
  /** Standard transitions (modal open, drawer push). */
  BASE: 220,
  /** Hero / page-level transitions. */
  SLOW: 360,
  /** Skeleton shimmer cycle. */
  SHIMMER: 1500,
} as const;

/** Card / hero image aspect ratios (width / height). */
export const ASPECT = {
  /** Race card cover image (horizontal hero). */
  RACE_COVER: 16 / 9,
  /** Square thumbnail (avatar, course icon). */
  SQUARE: 1,
  /** Portrait poster (e-waiver download, certificate). */
  POSTER: 3 / 4,
  /** BIB image. */
  BIB: 4 / 3,
  /** Map / route image. */
  MAP: 16 / 10,
} as const;

/** Modal / sheet sizing fractions of viewport height. */
export const MODAL = {
  /** Small confirmation modal. */
  SMALL: 0.35,
  /** Standard form modal. */
  MEDIUM: 0.6,
  /** Large detail sheet. */
  LARGE: 0.85,
  /** Full-screen takeover (signup, signature canvas). */
  FULL: 1,
} as const;

/** Pagination defaults. */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  RACE_LIST_PAGE_SIZE: 12,
  TICKETS_PAGE_SIZE: 20,
  RESULTS_PAGE_SIZE: 25,
} as const;

/** Cache TTL in ms — used by react-query staleTime defaults. */
export const CACHE_TTL = {
  /** Race list (relatively stable). */
  RACE_LIST: 30 * 60 * 1000,
  /** Race detail. */
  RACE_DETAIL: 15 * 60 * 1000,
  /** User profile. */
  USER: 5 * 60 * 1000,
  /** Ticket list (refresh on tab focus). */
  TICKETS: 60 * 1000,
} as const;

/** Touch target minimums (BR a11y — iOS 44pt / Android 48dp). */
export const TOUCH_TARGET = {
  IOS_MIN: 44,
  ANDROID_MIN: 48,
} as const;

/** App-level limits. */
export const LIMITS = {
  /** Max chars on BIB display name. */
  BIB_NAME_MAX: 15,
  /** Max chars in transfer message. */
  TRANSFER_MESSAGE_MAX: 500,
  /** Max retries for OTP request before lockout. */
  OTP_REQUEST_MAX: 5,
  /** OTP request cooldown in seconds. */
  OTP_RESEND_COOLDOWN_S: 60,
} as const;
