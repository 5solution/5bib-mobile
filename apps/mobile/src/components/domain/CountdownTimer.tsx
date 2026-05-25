/**
 * apps/mobile/src/components/domain/CountdownTimer.tsx
 *
 * Component-15 — Real-time countdown UI.
 *
 * Reference:
 *   - 01-ba-prd-epic-3-checkout.md — payment timeout countdown
 *   - 01-ba-prd-epic-4-tickets.md rev2 — Rolling BIB expiry countdown
 *
 * Format HH:MM:SS or MM:SS.
 * Variants: `gold` (Rolling BIB), `neutral` (payment timeout), `danger` (urgent <60s).
 *
 * Wraps the existing `useCountdown` hook in src/hooks/index.ts and exposes
 * an `onExpire` callback for parent navigation.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { tokens } from '../../theme/tokens';
import { useCountdown } from '../../hooks';

export type CountdownVariant = 'gold' | 'neutral' | 'danger';
export type CountdownFormat = 'HH:MM:SS' | 'MM:SS';

export interface CountdownTimerProps {
  /** Absolute target time as ISO string. Component computes seconds-left internally. */
  targetDate: string;
  /** Visual variant (default `neutral`). */
  variant?: CountdownVariant;
  /** Time format string (default auto: HH:MM:SS if >1h, else MM:SS). */
  format?: CountdownFormat;
  /** Called once when timer hits 0. */
  onExpire?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Optional A11Y prefix e.g. "Còn lại". */
  label?: string;
}

const VARIANT_COLORS: Record<CountdownVariant, { bg: string; fg: string }> = {
  gold: { bg: tokens.color.warningBg, fg: tokens.color.brandAccent },
  neutral: { bg: tokens.color.neutral100, fg: tokens.color.neutral800 },
  danger: { bg: tokens.color.errorBg, fg: tokens.color.error },
};

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, '0');
}

function formatTime(totalSeconds: number, fmt: CountdownFormat): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (fmt === 'HH:MM:SS') return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  // MM:SS — collapse hours into minutes if any.
  return `${pad(hh * 60 + mm)}:${pad(ss)}`;
}

export function CountdownTimer({
  targetDate,
  variant = 'neutral',
  format,
  onExpire,
  style,
  label,
}: CountdownTimerProps) {
  const initialSeconds = useMemo(() => {
    const diff = new Date(targetDate).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  }, [targetDate]);

  const { seconds } = useCountdown(initialSeconds, true);
  const firedRef = useRef(false);

  useEffect(() => {
    if (seconds <= 0 && !firedRef.current) {
      firedRef.current = true;
      onExpire?.();
    }
  }, [seconds, onExpire]);

  const autoFormat: CountdownFormat = format ?? (initialSeconds >= 3600 ? 'HH:MM:SS' : 'MM:SS');
  const colors = VARIANT_COLORS[variant];
  const display = formatTime(seconds, autoFormat);

  return (
    <View
      accessibilityRole="timer"
      accessibilityLabel={`${label ?? 'Còn lại'} ${display}`}
      accessibilityLiveRegion="polite"
      style={[
        {
          backgroundColor: colors.bg,
          paddingHorizontal: tokens.space[3],
          paddingVertical: tokens.space[2],
          borderRadius: tokens.radius.md,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text
        style={{
          color: colors.fg,
          fontSize: tokens.fontSize.h3,
          fontWeight: tokens.fontWeight.bold,
          fontFamily: tokens.fonts.mono.default,
          letterSpacing: 1,
        }}
      >
        {display}
      </Text>
    </View>
  );
}
