/**
 * apps/mobile/src/components/motion/AnimatedLogo.tsx
 *
 * 5BIB-branded SVG mark that draws itself stroke-by-stroke on mount, like
 * an Apple Pencil writing it out. Use it on the splash → home transition,
 * empty states for first-launch, and the auth screen hero.
 *
 * How it works:
 *   - Each letter is one `<Path>` with a known stroke total length.
 *   - `strokeDasharray = totalLength` + animated `strokeDashoffset` from
 *     `totalLength → 0` reveals the stroke left-to-right.
 *   - Letters animate sequentially with a small overlap (the "5" finishes
 *     drawing while "B" starts — gives motion continuity).
 *   - After the last letter finishes, a single "fill flash" pulses the
 *     stroke width (3 → 8 → 3) while the color transitions from neutral500
 *     to brandPrimary, signaling "I'm fully alive now". Whole sequence
 *     finishes around the 1.5s mark.
 *
 * Built entirely on Reanimated 3 → animation lives on the UI thread, no JS
 * jank during cold-start transitions.
 */

import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedProps,
  withDelay,
  withSequence,
  withTiming,
  runOnJS,
  interpolateColor,
} from 'react-native-reanimated';
import { tokens } from '../../theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Stylized 5BIB letterforms in a 100×40 viewBox. Each letter takes ~20pt
 * horizontal space with 2pt gap. The exact path commands are deliberately
 * simple — these should READ as "5BIB" on screen, not match a pixel-perfect
 * brand mark (we'll swap in the final SVG once design hands off).
 *
 * `length` is a rough approximation of the path's stroke length, used to
 * configure `strokeDasharray` + `strokeDashoffset`. SVG `getTotalLength()`
 * isn't available in react-native-svg, so we eyeball it. Worst case it
 * over-shoots slightly, producing a brief "already drawn" flash — fine.
 */
const LETTERS: ReadonlyArray<{ d: string; length: number }> = [
  // "5" — top bar → left descender → belly curve.
  {
    d: 'M 16 6 L 4 6 L 4 18 Q 14 14 16 22 Q 18 32 4 32',
    length: 70,
  },
  // "B" — vertical spine + two bumps.
  {
    d: 'M 24 6 L 24 32 M 24 6 L 34 6 Q 40 6 40 12 Q 40 18 30 18 L 24 18 M 24 18 L 36 18 Q 42 18 42 24 Q 42 32 34 32 L 24 32',
    length: 110,
  },
  // "I" — slab serif top + spine + serif bottom.
  {
    d: 'M 50 6 L 60 6 M 55 6 L 55 32 M 50 32 L 60 32',
    length: 46,
  },
  // "B" again — copy of the second letter, shifted right.
  {
    d: 'M 70 6 L 70 32 M 70 6 L 80 6 Q 86 6 86 12 Q 86 18 76 18 L 70 18 M 70 18 L 82 18 Q 88 18 88 24 Q 88 32 80 32 L 70 32',
    length: 110,
  },
];

/** Per-letter draw duration (ms). */
const LETTER_DRAW_MS = 280;
/** Stagger between letters — small negative overlap → continuous flow feel. */
const LETTER_STAGGER_MS = 220;
/** Fill-flash pulse duration after all letters drawn. */
const FILL_FLASH_MS = 320;

export interface AnimatedLogoProps {
  /** Square box size in pt. The SVG viewBox is letter-boxed inside. Default 120. */
  size?: number;
  /** Final stroke color. Default `tokens.color.brandPrimary`. */
  color?: string;
  /** Starting (neutral) stroke color, before the fill-flash. Default neutral500. */
  fromColor?: string;
  /** Delay before first letter starts drawing, in ms. Default 0. */
  delay?: number;
  /** Fires after the whole sequence (letters + fill-flash) completes. */
  onComplete?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedLogo({
  size = 120,
  color = tokens.color.brandPrimary,
  fromColor = tokens.color.neutral500,
  delay = 0,
  onComplete,
  style,
}: AnimatedLogoProps) {
  // One progress value per letter, 0→1. Driving `strokeDashoffset` off it
  // lets the path "ink in" left to right.
  const p0 = useSharedValue(0);
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  const p3 = useSharedValue(0);
  const progresses = [p0, p1, p2, p3];

  // Fill-flash drivers — stroke width pulse + color tween.
  const widthPulse = useSharedValue(0); // 0→1→0 over FILL_FLASH_MS
  const colorMix = useSharedValue(0);   // 0 = fromColor, 1 = color

  useEffect(() => {
    // Kick off letters with stagger. Each letter is its own withDelay + withTiming.
    LETTERS.forEach((_, i) => {
      const p = progresses[i];
      if (!p) return;
      p.value = withDelay(
        delay + i * LETTER_STAGGER_MS,
        withTiming(1, {
          duration: LETTER_DRAW_MS,
          // power2.out — feels like a calligrapher easing into the stroke end.
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      );
    });

    // Schedule fill-flash after all letters finish drawing.
    const fillStart = delay + (LETTERS.length - 1) * LETTER_STAGGER_MS + LETTER_DRAW_MS;

    widthPulse.value = withDelay(
      fillStart,
      withSequence(
        withTiming(1, { duration: FILL_FLASH_MS / 2, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: FILL_FLASH_MS / 2, easing: Easing.in(Easing.quad) }),
      ),
    );
    colorMix.value = withDelay(
      fillStart,
      withTiming(
        1,
        { duration: FILL_FLASH_MS, easing: Easing.inOut(Easing.quad) },
        (finished) => {
          if (finished && onComplete) {
            runOnJS(onComplete)();
          }
        },
      ),
    );
    // We intentionally only react to mount — the sequence is one-shot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 100 40"
        // preserveAspectRatio default ("xMidYMid meet") letter-boxes the
        // 100×40 art inside the square box — vertically centered.
      >
        {LETTERS.map((letter, i) => {
          const p = progresses[i];
          if (!p) return null;
          return (
            <AnimatedLetter
              key={i}
              d={letter.d}
              length={letter.length}
              progress={p}
              colorMix={colorMix}
              widthPulse={widthPulse}
              fromColor={fromColor}
              toColor={color}
            />
          );
        })}
      </Svg>
    </View>
  );
}

/**
 * Internal — a single letter Path bound to its progress driver. Split out so
 * each `useAnimatedProps` is its own worklet hook (Reanimated requires hooks
 * at the top level of a component, not inside a `.map`).
 */
interface AnimatedLetterProps {
  d: string;
  length: number;
  progress: Animated.SharedValue<number>;
  colorMix: Animated.SharedValue<number>;
  widthPulse: Animated.SharedValue<number>;
  fromColor: string;
  toColor: string;
}

function AnimatedLetter({
  d,
  length,
  progress,
  colorMix,
  widthPulse,
  fromColor,
  toColor,
}: AnimatedLetterProps) {
  const animatedProps = useAnimatedProps(() => {
    // strokeDashoffset goes from `length` (fully hidden) → 0 (fully drawn).
    const offset = length * (1 - progress.value);
    // Stroke width breathes from 3 → 8 → 3 during the fill-flash.
    const strokeWidth = 3 + widthPulse.value * 5;
    // Color tween from neutral → brand during fill-flash.
    const stroke = interpolateColor(
      colorMix.value,
      [0, 1],
      [fromColor, toColor],
    );
    return {
      strokeDashoffset: offset,
      strokeWidth,
      stroke,
    };
  });

  return (
    <AnimatedPath
      d={d}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={`${length}, ${length}`}
      animatedProps={animatedProps}
    />
  );
}
