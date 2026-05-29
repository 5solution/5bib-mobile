/**
 * apps/mobile/src/components/motion/index.ts
 *
 * Motion primitives — GSAP-equivalent toolkit for the 5BIB mobile app. All
 * built on Reanimated 3 so they run on the UI thread (smooth even when JS
 * is busy fetching/parsing).
 *
 * Currently in PROTOTYPE — applied only to ticket detail. If the feel
 * lands, FEATURE-004 will roll these out across the app.
 *
 *   FadeSlideIn    — mount fade + slide-up, supports delay for stagger
 *   PressScale     — tactile press-down with spring release
 *   QRPulseRing    — looping breathing rings around live ticket QR
 *   BadgeShimmer   — periodic shine sweep for action-needed badges
 */

export { FadeSlideIn } from './FadeSlideIn';
export type { FadeSlideInProps } from './FadeSlideIn';

export { StaggerItem } from './StaggerItem';
export type { StaggerItemProps } from './StaggerItem';

export { PressScale } from './PressScale';
export type { PressScaleProps } from './PressScale';

export { QRPulseRing } from './QRPulseRing';
export type { QRPulseRingProps } from './QRPulseRing';

export { BadgeShimmer } from './BadgeShimmer';
export type { BadgeShimmerProps } from './BadgeShimmer';

export { SuccessBurst } from './SuccessBurst';
export type { SuccessBurstProps } from './SuccessBurst';
