/**
 * apps/mobile/src/components/domain/RollingNumber.tsx
 *
 * Component-12 — Animated single-digit slot machine number.
 *
 * Reference:
 *   - 01-ba-prd-epic-4-tickets.md rev2 — Rolling BIB state 2 (spinning) → state 3 (settle)
 *   - 01-ba-prd-ux-patterns-reference.md — animation tokens (fast/normal/slow)
 *
 * Cycles digits 0–9 at configurable speed; when `isSpinning` flips false,
 * decelerates ("slow-stop") and lands on `targetDigit`, then calls `onSettled`.
 *
 * Respects `prefersReducedMotion` via AccessibilityInfo — skips spin and
 * snaps directly to target.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, AccessibilityInfo } from 'react-native';
import { tokens } from '../../theme/tokens';

export interface RollingNumberProps {
  /** Final digit (0–9) to settle on when isSpinning flips false. */
  targetDigit: number;
  /** When true, cycles through 0-9 rapidly. When false, decelerates → settles. */
  isSpinning: boolean;
  /** Spin speed in ms per digit change (default: 60ms). */
  spinIntervalMs?: number;
  /** Called after settle animation completes. */
  onSettled?: () => void;
  /** Background of digit box. Default neutral900. */
  bgColor?: string;
  /** Text color. Default neutral0. */
  textColor?: string;
  /** Font size (default: displayLg 32). */
  size?: number;
}

export function RollingNumber({
  targetDigit,
  isSpinning,
  spinIntervalMs = 60,
  onSettled,
  bgColor = tokens.color.neutral900,
  textColor = tokens.color.neutral0,
  size = tokens.fontSize.displayLg,
}: RollingNumberProps) {
  const [displayDigit, setDisplayDigit] = useState<number>(targetDigit);
  const [reducedMotion, setReducedMotion] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const decelTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Check reduced motion preference (A11Y).
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => sub.remove();
  }, []);

  // Spin loop / settle handling.
  useEffect(() => {
    const clearAll = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      decelTimeoutsRef.current.forEach(clearTimeout);
      decelTimeoutsRef.current = [];
    };

    if (reducedMotion) {
      // A11Y: skip animation, snap to target.
      setDisplayDigit(targetDigit);
      if (!isSpinning) onSettled?.();
      return clearAll;
    }

    if (isSpinning) {
      intervalRef.current = setInterval(() => {
        setDisplayDigit((d) => (d + 1) % 10);
      }, spinIntervalMs);
    } else {
      // Decelerate: schedule 5 increasing-delay ticks, then land on target.
      clearAll();
      const decelSteps = [spinIntervalMs * 2, spinIntervalMs * 3, spinIntervalMs * 5, spinIntervalMs * 8];
      let cumulative = 0;
      decelSteps.forEach((step) => {
        cumulative += step;
        decelTimeoutsRef.current.push(
          setTimeout(() => {
            setDisplayDigit((d) => (d + 1) % 10);
          }, cumulative),
        );
      });
      // Final settle.
      cumulative += spinIntervalMs * 10;
      decelTimeoutsRef.current.push(
        setTimeout(() => {
          setDisplayDigit(targetDigit);
          onSettled?.();
        }, cumulative),
      );
    }

    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning, reducedMotion, targetDigit, spinIntervalMs]);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={isSpinning ? 'Đang quay số' : `Số ${targetDigit}`}
      style={{
        backgroundColor: bgColor,
        width: size + tokens.space[3],
        height: size + tokens.space[4],
        borderRadius: tokens.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: textColor,
          fontSize: size,
          fontWeight: tokens.fontWeight.bold,
          fontFamily: tokens.fonts.mono.default,
          lineHeight: size + 4,
        }}
      >
        {displayDigit}
      </Text>
    </View>
  );
}
