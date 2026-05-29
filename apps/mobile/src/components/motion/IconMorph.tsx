/**
 * apps/mobile/src/components/motion/IconMorph.tsx
 *
 * Toggleable icon that flips around the Y-axis to swap between an "off" and
 * "on" glyph — like the heart on Twitter/Instagram, or the bookmark star on
 * Apple Maps. The Y-flip + glyph swap at 90° hides the discontinuity, so the
 * transition reads as a single physical card-flip instead of a crossfade.
 *
 * Built on Reanimated 3:
 *   - `rotateY` runs 0 → 90° (front face hidden) → 0° (back face shown).
 *   - At the 90° midpoint we toggle which glyph is visible, so the user
 *     only ever sees the "new" icon coming back into view.
 *   - Whole motion is ~350ms — fast enough to feel responsive on a like tap.
 *
 * Wrapped in `PressScale` + `haptics.light()` so the press itself feels tactile
 * — the morph is just the *visual* confirmation; the wrist confirmation is
 * what makes it satisfying.
 *
 * Usage:
 *   <IconMorph
 *     iconOff="❤"
 *     iconOn="❤️‍🔥"
 *     active={isFavorite}
 *     size={32}
 *     onPress={toggleFavorite}
 *   />
 */

import React, { useEffect } from 'react';
import { Text, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { PressScale } from './PressScale';
import { haptics } from './haptics';

const FLIP_MS = 350;
/** Midpoint where we swap the visible glyph (rotateY = 90°). */
const HALF = FLIP_MS / 2;

export interface IconMorphProps {
  /** Glyph shown when `active === false`. Can be an emoji or short text. */
  iconOff: string;
  /** Glyph shown when `active === true`. */
  iconOn: string;
  /** Controlled state — drives the flip. */
  active: boolean;
  /** Font size of the rendered glyph (px). Default 32. */
  size?: number;
  /** Optional color override applied to BOTH glyphs. */
  color?: string;
  /** Tap handler. Wrapped with `haptics.light()` before invocation. */
  onPress?: () => void;
  /** Disable interaction + animation. */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}

export function IconMorph({
  iconOff,
  iconOn,
  active,
  size = 32,
  color,
  onPress,
  disabled,
  style,
  textStyle,
  accessibilityLabel,
}: IconMorphProps) {
  // Single progress driver 0 → 1 represents a full flip cycle.
  // 0 = front face (iconOff), 1 = back face (iconOn). Direction of the
  // shared value reflects `active` so re-toggling reverses the flip.
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, {
      duration: FLIP_MS,
      // outCubic — feels physical, like a card snapping flat at the end.
      easing: Easing.bezier(0.33, 1, 0.68, 1),
    });
  }, [active, progress]);

  // Both glyphs share the same slot — animated opacity hides whichever isn't
  // currently being shown. The opacity flips abruptly at the 50% mark (when
  // rotateY = 90°, both faces are edge-on so the swap is invisible).
  const offStyle = useAnimatedStyle(() => {
    const rotate = interpolate(progress.value, [0, 1], [0, 180], Extrapolation.CLAMP);
    // iconOff visible for the first half of the flip only.
    const opacity = progress.value < 0.5 ? 1 : 0;
    return {
      position: 'absolute',
      opacity,
      transform: [{ perspective: 600 }, { rotateY: `${rotate}deg` }],
    };
  });

  const onAnimatedStyle = useAnimatedStyle(() => {
    // iconOn lives on the back face — start at 180° so it reads upright when
    // the container has rotated through the second half.
    const rotate = interpolate(progress.value, [0, 1], [-180, 0], Extrapolation.CLAMP);
    const opacity = progress.value >= 0.5 ? 1 : 0;
    return {
      position: 'absolute',
      opacity,
      transform: [{ perspective: 600 }, { rotateY: `${rotate}deg` }],
    };
  });

  const handlePress = () => {
    if (disabled) return;
    haptics.light();
    onPress?.();
  };

  // Square hit area sized to the glyph. The wrapping View must reserve space
  // since both icons are absolutely positioned inside it.
  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const glyphStyle: TextStyle = {
    fontSize: size,
    // Tight line-height keeps the glyph centered vertically without padding
    // shifts that would betray the perspective transform.
    lineHeight: size,
    textAlign: 'center',
    ...(color ? { color } : {}),
  };

  return (
    <PressScale
      onPress={handlePress}
      disabled={disabled}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (active ? iconOn : iconOff)}
    >
      <Animated.View style={containerStyle}>
        <Animated.Text style={[glyphStyle, textStyle, offStyle]}>
          {iconOff}
        </Animated.Text>
        <Animated.Text style={[glyphStyle, textStyle, onAnimatedStyle]}>
          {iconOn}
        </Animated.Text>
      </Animated.View>
    </PressScale>
  );
}

// Re-export the swap timing for callers that want to chain a parent
// animation (e.g. a "+1" floating label that fires at the midpoint).
export const ICON_MORPH_TIMING = { totalMs: FLIP_MS, swapAtMs: HALF };
