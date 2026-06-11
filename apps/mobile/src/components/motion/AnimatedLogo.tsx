/**
 * apps/mobile/src/components/motion/AnimatedLogo.tsx
 *
 * Animated OFFICIAL 5bib wordmark for the launch splash.
 *
 * Rewritten 2026-06-11: previously this drew hand-invented letterforms
 * with a stroke-dashoffset trick. Now it animates the real brand paths
 * (src/components/BrandLogo.tsx, copied from the production logo.svg):
 *
 *   timeline (ms from mount, default delay 0):
 *      0  "5" fades up
 *    140  first "b"
 *    280  "i" (dot + stem together)
 *    420  second "b"
 *    640  pink flag pops in with a spring overshoot — the brand wink
 *   ~1.1s onComplete fires
 *
 * Letters rise 12% of the logo height while fading in — same easing as the
 * rest of the motion system (power2.out-ish bezier). Runs on the UI thread.
 */

import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedProps,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';

import {
  BRAND_LOGO_PATHS,
  BRAND_LOGO_RATIO,
} from '../BrandLogo';

const AnimatedG = Animated.createAnimatedComponent(G);

/** Per-letter reveal duration. */
const LETTER_MS = 320;
/** Stagger between letter groups. */
const STAGGER_MS = 140;
/** Order of reveal. */
const GROUP_ORDER = ['five', 'b1', 'i', 'b2', 'flag'] as const;

export interface AnimatedLogoProps {
  /** Rendered logo WIDTH in pt (height follows the 79:32 ratio).
   *  Kept the old prop name `size` for call-site compatibility. */
  size?: number;
  /** Delay before the first letter, in ms. Default 0. */
  delay?: number;
  /** Fires after the flag lands. */
  onComplete?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedLogo({
  size = 160,
  delay = 0,
  onComplete,
  style,
}: AnimatedLogoProps) {
  const height = size * BRAND_LOGO_RATIO;

  // One progress driver per letter group (0 → 1).
  const five = useSharedValue(0);
  const b1 = useSharedValue(0);
  const i = useSharedValue(0);
  const b2 = useSharedValue(0);
  const flag = useSharedValue(0);
  const drivers: Record<(typeof GROUP_ORDER)[number], SharedValue<number>> = {
    five,
    b1,
    i,
    b2,
    flag,
  };

  useEffect(() => {
    GROUP_ORDER.forEach((g, idx) => {
      const at = delay + idx * STAGGER_MS + (g === 'flag' ? 80 : 0);
      if (g === 'flag') {
        // The flag pops with an overshoot — small, deliberate brand wink.
        drivers[g].value = withDelay(
          at,
          withSequence(
            withSpring(1.15, { damping: 9, stiffness: 240 }),
            withTiming(
              1,
              { duration: 120, easing: Easing.out(Easing.quad) },
              (finished) => {
                if (finished && onComplete) runOnJS(onComplete)();
              },
            ),
          ),
        );
      } else {
        drivers[g].value = withDelay(
          at,
          withTiming(1, {
            duration: LETTER_MS,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        );
      }
    });
    // One-shot on mount by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={[{ width: size, height }, style]}
      accessibilityRole="image"
      accessibilityLabel="5bib"
    >
      <Svg width={size} height={height} viewBox="0 0 79 32">
        {GROUP_ORDER.map((g) => (
          <AnimatedLetterGroup key={g} group={g} progress={drivers[g]} />
        ))}
      </Svg>
    </View>
  );
}

/**
 * One letter group — own component so each useAnimatedProps is a top-level
 * hook (rules-of-hooks: no hooks inside .map of the parent render).
 */
function AnimatedLetterGroup({
  group,
  progress,
}: {
  group: (typeof GROUP_ORDER)[number];
  progress: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => {
    const p = progress.value;
    return {
      opacity: Math.min(p, 1),
      // Rise from 4 SVG-units below (≈12% of the 32-unit artboard).
      // The flag scales instead — translate would detach it from the "5".
      transform:
        group === 'flag'
          ? [{ scale: p }]
          : [{ translateY: (1 - Math.min(p, 1)) * 4 }],
    };
  });

  // The flag scales around its own corner (origin near the "5" top), which
  // visually reads as it unfurling from the letter.
  const originProps =
    group === 'flag' ? { origin: '7,3' as const } : {};

  return (
    <AnimatedG animatedProps={animatedProps} {...originProps}>
      {BRAND_LOGO_PATHS.filter((p) => p.group === group).map((p, idx) => (
        <Path key={idx} d={p.d} fill={p.color} />
      ))}
    </AnimatedG>
  );
}
