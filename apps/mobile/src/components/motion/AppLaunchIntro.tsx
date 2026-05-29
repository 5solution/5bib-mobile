/**
 * apps/mobile/src/components/motion/AppLaunchIntro.tsx
 *
 * Full-screen splash overlay that animates the 5BIB mark in, holds for a
 * beat, then fades away to reveal the app underneath. Use it once at the
 * very top of the root layout — it owns the first ~1.9s of cold start.
 *
 * Behavior (timeline, all ms relative to mount):
 *
 *     0     <AnimatedLogo> starts drawing its strokes (self-animates).
 *   800     Tagline "Mỗi BIB — Một câu chuyện" fades in.
 *  1500     Overlay starts fading out (400ms timing).
 *  1900     `onComplete` fires. Children render at full opacity.
 *
 * Children are rendered the whole time, underneath the overlay — so React /
 * data work happens during the splash instead of after it. This means the
 * first paint after fade-out is interactive, not a second blank flash.
 *
 *   <AppLaunchIntro onComplete={() => setReady(true)}>
 *     <RootStack />
 *   </AppLaunchIntro>
 *
 * The overlay is `pointerEvents: 'none'` once the fade-out begins so the
 * app behind it becomes tappable as the opacity drops, not all at once at
 * the end.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { tokens } from '../../theme/tokens';
import { AnimatedLogo } from './AnimatedLogo';

/** Logo size on the splash. Matches the iOS launch-image vibe. */
const LOGO_SIZE = 160;

/** Timing constants — single source of truth, also documented in JSDoc above. */
const TAGLINE_FADE_IN_DELAY_MS = 800;
const TAGLINE_FADE_IN_DURATION_MS = 320;
const OVERLAY_FADE_OUT_DELAY_MS = 1500;
const OVERLAY_FADE_OUT_DURATION_MS = 400;

const TAGLINE_TEXT = 'Mỗi BIB — Một câu chuyện';

export interface AppLaunchIntroProps {
  /** Rendered behind / under the splash. Stays mounted the whole time. */
  children: React.ReactNode;
  /** Fires once the overlay has fully faded out. */
  onComplete?: () => void;
}

/**
 * Splash overlay wrapper. Children are always rendered (so they can warm up
 * during the intro); the overlay sits on top and fades away.
 */
export function AppLaunchIntro({ children, onComplete }: AppLaunchIntroProps) {
  // Shared values for the overlay fade-out and tagline fade-in.
  const overlayOpacity = useSharedValue(1);
  const taglineOpacity = useSharedValue(0);

  // Track JS-side completion so we can stop blocking pointer events.
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Tagline: subtle fade-in after the logo has started drawing.
    taglineOpacity.value = withDelay(
      TAGLINE_FADE_IN_DELAY_MS,
      withTiming(1, {
        duration: TAGLINE_FADE_IN_DURATION_MS,
        easing: Easing.out(Easing.quad),
      }),
    );

    // Overlay fade-out — when it completes, flip `done` on the JS side and
    // fire the consumer callback.
    overlayOpacity.value = withDelay(
      OVERLAY_FADE_OUT_DELAY_MS,
      withTiming(
        0,
        {
          duration: OVERLAY_FADE_OUT_DURATION_MS,
          easing: Easing.in(Easing.quad),
        },
        (finished) => {
          if (finished) {
            runOnJS(setDone)(true);
            if (onComplete) {
              runOnJS(onComplete)();
            }
          }
        },
      ),
    );
    // Safety net: if the Reanimated callback never fires (worklet cancellation,
    // app backgrounded during the intro, etc.) force the overlay off after the
    // expected total time + 1s of slack. Without this the splash could stick
    // forever on edge cases, blocking the whole app behind an invisible
    // overlay with pointerEvents="none" (still blocks visual confidence).
    const fallback = setTimeout(
      () => setDone(true),
      OVERLAY_FADE_OUT_DELAY_MS + OVERLAY_FADE_OUT_DURATION_MS + 1000,
    );
    return () => clearTimeout(fallback);
    // One-shot — splash never re-plays for the same mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    // Subtle upward slide as it fades in — keeps it from feeling static.
    transform: [{ translateY: (1 - taglineOpacity.value) * 8 }],
  }));

  return (
    // Children render as the layout root (normal flex flow) — important for
    // Expo Router's <Stack>, which expects a real flex parent rather than an
    // absolutely-positioned wrapper. The overlay sits on top via absolute
    // positioning so it never participates in the layout tree of the app.
    <View style={styles.root}>
      {children}

      {/* Overlay — sits on top until the fade-out finishes. */}
      {!done && (
        <Animated.View
          style={[styles.overlay, overlayStyle]}
          // pointerEvents="none" — nothing inside is interactive, and we
          // want the underlying app to be tappable as the opacity drops.
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <AnimatedLogo size={LOGO_SIZE} />
          <Animated.View style={[styles.taglineWrap, taglineStyle]}>
            <Text style={styles.tagline} accessibilityLabel={TAGLINE_TEXT}>
              {TAGLINE_TEXT}
            </Text>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: tokens.color.surfaceBg,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.color.surfaceBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taglineWrap: {
    marginTop: tokens.space[5],
    paddingHorizontal: tokens.space[6],
  },
  tagline: {
    fontSize: tokens.fontSize.bodyLg,
    lineHeight: tokens.lineHeight.bodyLg,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.color.neutral600,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
