/**
 * apps/mobile/src/components/motion/haptics.ts
 *
 * Thin wrapper over expo-haptics so screens don't have to think about
 * platform availability or the noisy Haptics.ImpactFeedbackStyle enum. We
 * also fail-soft: if the user has tactile feedback disabled at the OS level
 * (or we're on a sim that returns an error), the call is swallowed.
 *
 * The motion layer's #1 cheat code — 50% of the "premium" feel of iOS apps
 * lives in the wrist, not the eye.
 *
 * Usage:
 *   import { haptics } from '../components/motion/haptics';
 *   haptics.light();    // card tap
 *   haptics.medium();   // primary CTA press
 *   haptics.success();  // payment complete
 *   haptics.warning();  // form validation fail
 *   haptics.error();    // hard error
 *   haptics.tick();     // segmented control switch / picker
 */

import * as Haptics from 'expo-haptics';

function safe<T>(fn: () => Promise<T>): void {
  // expo-haptics returns a promise we don't await; ignore both rejection
  // and unsupported-platform errors so callers stay synchronous.
  fn().catch(() => {});
}

export const haptics = {
  /** Subtle — card press, list item tap, badge interaction. */
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),

  /** Confident — primary CTA, sheet open, important toggle. */
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),

  /** Strong — destructive confirm, irreversible action. */
  heavy: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),

  /** Distinct double-tick — payment success, register success. */
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),

  /** Distinct triple-tick — form validation, soft warning. */
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),

  /** Distinct burst — hard error (transfer failed, 500). */
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),

  /** Picker / segmented control / wheel tick. */
  tick: () => safe(() => Haptics.selectionAsync()),
};

export type HapticVariant = keyof typeof haptics;
