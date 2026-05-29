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

export { Flip3D, DoubleSidedFlip } from './Flip3D';
export type { Flip3DProps, DoubleSidedFlipProps } from './Flip3D';

export { AppLaunchIntro } from './AppLaunchIntro';
export type { AppLaunchIntroProps } from './AppLaunchIntro';

export { SwipeActions } from './SwipeActions';
export type { SwipeActionsProps, SwipeAction, SwipeActionsHandle } from './SwipeActions';

export { SkiaConfetti, useConfettiTrigger } from './SkiaConfetti';
export type { SkiaConfettiProps } from './SkiaConfetti';

export { LottieView, LottiePlaceholder } from './LottieView';
export type { LottieViewProps, LottiePreset } from './LottieView';

export { AnimatedLogo } from './AnimatedLogo';
export type { AnimatedLogoProps } from './AnimatedLogo';

export { IconMorph, ICON_MORPH_TIMING } from './IconMorph';
export type { IconMorphProps } from './IconMorph';

export { haptics } from './haptics';
export type { HapticVariant } from './haptics';
