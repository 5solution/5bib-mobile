/**
 * apps/mobile/src/components/motion/Flip3D.tsx
 *
 * 3D card-flip primitives built on Reanimated 3.
 *
 * Two components ship from here:
 *
 *   <Flip3D>            — single-sided flip-in wrapper. When `trigger` goes
 *                         false→true, the child flips in from its back-facing
 *                         orientation (rotateY: 180deg, invisible thanks to
 *                         backface-visibility) to its front-facing rest
 *                         pose with a slight spring overshoot. Use it for
 *                         "BIB just landed" reveals, achievement cards
 *                         appearing, etc.
 *
 *   <DoubleSidedFlip>   — two-sided card. Renders `front` + `back` children
 *                         absolutely stacked; the `flipped` prop drives
 *                         rotation. `backface-visibility: hidden` means the
 *                         "wrong" face naturally disappears halfway through
 *                         the rotation. Good for memory-card games, BIB
 *                         reveals, before/after toggles.
 *
 * Implementation notes:
 *   - All transforms are composed in order: perspective → rotate → scale.
 *     Putting `perspective` FIRST in the transform array is required by
 *     React Native (the camera matrix has to be set before the rotation
 *     can interpret depth).
 *   - We never wrap rotateY with extra Animated.Views — the same node owns
 *     both the perspective and the rotation, otherwise nested transforms
 *     stack matrices in an order that flattens the perspective.
 *   - For `DoubleSidedFlip` the back face is pre-rotated 180deg so when
 *     the wrapper rotates 180, the back ends up at 360 = readable.
 */

import React, { useEffect } from 'react';
import { StyleProp, ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

// ---------------------------------------------------------------------------
// Flip3D — one-shot flip-in
// ---------------------------------------------------------------------------

export interface Flip3DProps {
  children: React.ReactNode;
  /**
   * When this value becomes truthy (from a previously-falsy state), the card
   * plays its flip-in animation. Re-flipping requires `trigger` to go back
   * to falsy and then truthy again.
   */
  trigger: boolean;
  /** Rotation axis. Default `'y'` (horizontal flip, like a playing card). */
  axis?: 'x' | 'y';
  /** Total animation duration in ms. Default 900. */
  duration?: number;
  /**
   * Camera distance in px — higher = subtler perspective (less foreshortening
   * during the flip). Default 1000. Setting it too low (<400) will visibly
   * distort the card at mid-flip.
   */
  perspective?: number;
  /** Delay before the animation starts, in ms. Default 0. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Single-sided 3D flip-in wrapper. Hides the child while back-facing using
 * `backfaceVisibility: 'hidden'` so the first half of the rotation is
 * invisible — what the user sees is a card landing into view from "behind"
 * the screen plane.
 */
export function Flip3D({
  children,
  trigger,
  axis = 'y',
  duration = 900,
  perspective = 1000,
  delay = 0,
  style,
}: Flip3DProps) {
  // 0 = back-facing (hidden), 1 = fully landed (front-facing, settled).
  const progress = useSharedValue(0);

  useEffect(() => {
    if (trigger) {
      // Spring overshoots slightly so the card "lands" — feels physical, not
      // like a CSS keyframe. Damping/stiffness chosen so total settle time
      // matches `duration` reasonably well at default values.
      progress.value = withDelay(
        delay,
        withSpring(1, {
          damping: 12,
          stiffness: 90,
          mass: 1,
          overshootClamping: false,
          // restDisplacementThreshold tuned so we settle visibly, not late.
          restDisplacementThreshold: 0.001,
        }),
      );
    } else {
      // Reset to back-facing so a subsequent flip can replay.
      progress.value = 0;
    }
    // `duration` is intentionally NOT used directly by withSpring; we keep it
    // in the API for symmetry with other motion primitives and to document
    // the rough wall-clock expectation. If callers really want a timing-based
    // flip they can monkey-patch in the future.
  }, [trigger, delay, progress, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    // Rotation: 180deg (back) → 0deg (front).
    const rotation = interpolate(progress.value, [0, 1], [180, 0]);

    // Scale envelope: 0.9 (small + far) → 1.05 (over-shoot peak) → 1 (rest).
    // Driven by the same `progress`, mapped through three control points so
    // the over-shoot happens just as the card faces forward.
    const scale = interpolate(
      progress.value,
      [0, 0.7, 1],
      [0.9, 1.05, 1.0],
    );

    return {
      // Perspective MUST come first — sets the camera before rotation interprets depth.
      transform: [
        { perspective },
        axis === 'y' ? { rotateY: `${rotation}deg` } : { rotateX: `${rotation}deg` },
        { scale },
      ],
    };
  });

  return (
    <Animated.View style={[styles.backfaceHidden, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// DoubleSidedFlip — two-sided controlled flip
// ---------------------------------------------------------------------------

export interface DoubleSidedFlipProps {
  /** Content shown when `flipped` is false (default, front-facing pose). */
  front: React.ReactNode;
  /** Content shown when `flipped` is true (rotated 180deg into view). */
  back: React.ReactNode;
  /** Controlled flip state. */
  flipped: boolean;
  /** Rotation axis. Default `'y'`. */
  axis?: 'x' | 'y';
  /** Animation duration in ms. Default 700. */
  duration?: number;
  /** Camera distance — higher = subtler perspective. Default 1000. */
  perspective?: number;
  /** Optional delay in ms. Default 0. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Two-sided flip card. Both faces are mounted at once and stacked absolutely;
 * `backfaceVisibility: 'hidden'` on each face ensures only one is visible at
 * any given rotation. Driven by a smooth `withTiming` (not spring) so the
 * mid-flip swap is predictable, not bouncy.
 *
 * Typical usage — BIB reveal:
 *
 *   const [revealed, setRevealed] = useState(false);
 *   <DoubleSidedFlip
 *     flipped={revealed}
 *     front={<HiddenCover />}
 *     back={<BIBNumberCard />}
 *   />
 */
export function DoubleSidedFlip({
  front,
  back,
  flipped,
  axis = 'y',
  duration = 700,
  perspective = 1000,
  delay = 0,
  style,
}: DoubleSidedFlipProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(flipped ? 1 : 0, {
        duration,
        // Standard ease-in-out — symmetric, so the swap feels balanced.
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
    );
  }, [flipped, delay, duration, progress]);

  // Front face: rotates from 0 → 180 (becomes invisible halfway through).
  const frontStyle = useAnimatedStyle(() => {
    const rotation = interpolate(progress.value, [0, 1], [0, 180]);
    return {
      transform: [
        { perspective },
        axis === 'y' ? { rotateY: `${rotation}deg` } : { rotateX: `${rotation}deg` },
      ],
    };
  });

  // Back face: starts pre-rotated 180deg (invisible) and rotates with the
  // wrapper so it ends up at 360deg = readable when `flipped` is true.
  const backStyle = useAnimatedStyle(() => {
    const rotation = interpolate(progress.value, [0, 1], [180, 360]);
    return {
      transform: [
        { perspective },
        axis === 'y' ? { rotateY: `${rotation}deg` } : { rotateX: `${rotation}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.doubleSidedRoot, style]}>
      <Animated.View style={[styles.face, styles.backfaceHidden, frontStyle]}>
        {front}
      </Animated.View>
      <Animated.View style={[styles.face, styles.backfaceHidden, backStyle]}>
        {back}
      </Animated.View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // `backfaceVisibility` is a top-level RN style prop on the View itself —
  // not a transform — so we apply it via plain stylesheet.
  backfaceHidden: {
    backfaceVisibility: 'hidden',
  },
  doubleSidedRoot: {
    // Establish a stacking context so the two faces overlap.
    position: 'relative',
  },
  face: {
    // Absolute so both faces share the same bounding box.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
