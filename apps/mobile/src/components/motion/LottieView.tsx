/**
 * apps/mobile/src/components/motion/LottieView.tsx
 *
 * Thin wrapper around `lottie-react-native` with a safe dynamic-require
 * fallback (same pattern QRDisplayCard.tsx uses for `react-native-qrcode-svg`).
 *
 * Two reasons we defer-load:
 *   1) Some platforms (e.g. RN Web in storybook, jest unit tests) don't have
 *      the native module wired up — a top-level `import` would crash the
 *      bundler. A try/catch require lets the file still type-check + render.
 *   2) When the asset JSON for a preset is missing (we ship them in waves
 *      via `apps/mobile/assets/lottie/*.json`), we degrade gracefully to an
 *      emoji placeholder instead of a red box.
 *
 * Usage:
 *   <LottieView preset="loading" style={{ width: 200, height: 200 }} />
 *   <LottieView source={require('./success.json')} loop={false} />
 */

import React from 'react';
import { View, Text, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { tokens } from '../../theme/tokens';

// Optional native dep — guarded so file still type-checks if not installed.
// In real Expo app: `expo install lottie-react-native`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LottieRN: any;
try {
  // Defer to runtime require so a missing native module doesn't crash the
  // metro bundler at parse time. Mirrors QRDisplayCard.tsx.
  LottieRN = require('lottie-react-native').default;
} catch {
  LottieRN = null;
}

/** Named animation presets — wired to assets in `apps/mobile/assets/lottie/`. */
export type LottiePreset = 'loading' | 'success' | 'empty' | 'error';

/**
 * Source for a Lottie animation. Either:
 *   - a `require('./foo.json')` numeric handle, OR
 *   - a `{ uri: 'https://…' }` remote URL, OR
 *   - a parsed JSON object (for runtime-fetched animations).
 */
export type LottieSource =
  | number
  | { uri: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Record<string, any>;

export interface LottieViewProps {
  /**
   * Direct source — JSON object, require() handle, or remote URI.
   * Takes precedence over `preset` when both are supplied.
   */
  source?: LottieSource;
  /**
   * Named preset to use a pre-bundled animation.
   * Currently returns null with a TODO — wire up the JSON assets in a follow-up.
   */
  preset?: LottiePreset;
  /** Auto-start playback on mount. Default true. */
  autoPlay?: boolean;
  /** Loop indefinitely. Default true. */
  loop?: boolean;
  /** Playback speed multiplier. Default 1. */
  speed?: number;
  style?: StyleProp<ViewStyle>;
  /** Fires once the animation finishes (only when `loop={false}`). */
  onAnimationFinish?: () => void;
}

/**
 * Fallback content when Lottie isn't available — a centered emoji + label.
 * Used both as the placeholder for missing preset JSON and when
 * `lottie-react-native` itself failed to load.
 */
export interface LottiePlaceholderProps {
  /** Emoji or short glyph to show. */
  emoji: string;
  /** Localized fallback caption (e.g. "Đang tải..."). */
  label?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function LottiePlaceholder({
  emoji,
  label,
  style,
  textStyle,
}: LottiePlaceholderProps) {
  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: tokens.space[2],
          minWidth: 120,
          minHeight: 120,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={label ?? emoji}
    >
      <Text style={{ fontSize: 48 }}>{emoji}</Text>
      {label ? (
        <Text
          style={[
            {
              fontSize: tokens.fontSize.bodyMd,
              color: tokens.color.neutral500,
              textAlign: 'center',
            },
            textStyle,
          ]}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

/** Built-in fallbacks per preset — used when the JSON asset isn't loaded yet. */
const PRESET_FALLBACK: Record<LottiePreset, { emoji: string; label: string }> = {
  loading: { emoji: '🏃', label: 'Đang tải...' },
  success: { emoji: '✅', label: 'Thành công' },
  empty: { emoji: '📭', label: 'Chưa có dữ liệu' },
  error: { emoji: '⚠️', label: 'Đã có lỗi xảy ra' },
};

/**
 * Resolve a preset name to its bundled JSON asset.
 *
 * TODO(motion): Drop the actual files into `apps/mobile/assets/lottie/` and
 * return `require('../../../assets/lottie/loading.json')` etc. Until then we
 * return null so the placeholder is rendered.
 */
function resolvePresetSource(_preset: LottiePreset): LottieSource | null {
  // Intentionally empty for now — see TODO above.
  return null;
}

export function LottieView({
  source,
  preset,
  autoPlay = true,
  loop = true,
  speed = 1,
  style,
  onAnimationFinish,
}: LottieViewProps) {
  // Resolve effective source: explicit prop wins, otherwise look up preset.
  const resolvedSource: LottieSource | null =
    source ?? (preset ? resolvePresetSource(preset) : null);

  // No source AND no native module → render placeholder.
  if (!resolvedSource || !LottieRN) {
    const fallback = preset ? PRESET_FALLBACK[preset] : { emoji: '✨', label: '' };
    return (
      <LottiePlaceholder
        emoji={fallback.emoji}
        label={fallback.label}
        style={style}
      />
    );
  }

  return (
    <LottieRN
      source={resolvedSource}
      autoPlay={autoPlay}
      loop={loop}
      speed={speed}
      style={style}
      onAnimationFinish={onAnimationFinish}
    />
  );
}
