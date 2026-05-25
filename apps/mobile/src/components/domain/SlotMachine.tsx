/**
 * apps/mobile/src/components/domain/SlotMachine.tsx
 *
 * Component-13 — Slot machine illustration (SVG) for Rolling BIB screen.
 *
 * Reference: 01-ba-prd-epic-4-tickets.md rev2 — Rolling BIB state 1 (idle illustration)
 *
 * Custom 5BIB-themed slot machine outline with 4 digit windows. Optional pulse
 * animation on the outer frame to invite user tap.
 *
 * TODO(production-asset): Replace with high-fidelity vector / Lottie animation
 *  designed by 5BIB brand team — current SVG is a placeholder geometric illustration.
 */

import React, { useEffect } from 'react';
import { View, AccessibilityInfo } from 'react-native';
import Svg, { Rect, G, Circle, Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { tokens } from '../../theme/tokens';

export interface SlotMachineProps {
  /** Diameter — width/height in px (default 240). */
  size?: number;
  /** Animate outer frame pulse (default true; auto-disabled under reduced motion). */
  pulse?: boolean;
  /** Number of digit windows (default 4 — matches 5BIB BIB length). */
  windows?: number;
}

export function SlotMachine({ size = 240, pulse = true, windows = 4 }: SlotMachineProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((rm) => {
      if (cancelled) return;
      if (pulse && !rm) {
        scale.value = withRepeat(withTiming(1.04, { duration: tokens.duration.slow }), -1, true);
      }
    });
    return () => {
      cancelled = true;
      cancelAnimation(scale);
    };
  }, [pulse, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const W = size;
  const H = size * 0.9;
  const frameStroke = tokens.color.brandPrimary;
  const bodyFill = tokens.color.brandPrimaryLight;
  const windowFill = tokens.color.neutral0;
  const accent = tokens.color.brandAccent;

  // Geometry for digit windows row.
  const winRowY = H * 0.42;
  const winH = H * 0.22;
  const totalWinWidth = W * 0.72;
  const winW = totalWinWidth / windows - 6;
  const winRowX = (W - totalWinWidth) / 2;

  return (
    <Animated.View
      style={animatedStyle}
      accessibilityRole="image"
      accessibilityLabel="Máy quay số BIB"
    >
      <View style={{ width: W, height: H }}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* Outer frame */}
          <Rect
            x={6}
            y={6}
            width={W - 12}
            height={H - 12}
            rx={tokens.radius.xl}
            fill={bodyFill}
            stroke={frameStroke}
            strokeWidth={3}
          />

          {/* Top header strip */}
          <Rect
            x={W * 0.18}
            y={H * 0.08}
            width={W * 0.64}
            height={H * 0.14}
            rx={tokens.radius.md}
            fill={frameStroke}
          />

          {/* Digit windows row */}
          <G>
            {Array.from({ length: windows }).map((_, i) => (
              <Rect
                key={i}
                x={winRowX + i * (winW + 6)}
                y={winRowY}
                width={winW}
                height={winH}
                rx={tokens.radius.sm}
                fill={windowFill}
                stroke={tokens.color.neutral300}
                strokeWidth={1.5}
              />
            ))}
          </G>

          {/* Lever on the right side */}
          <G>
            <Path
              d={`M ${W - 18} ${H * 0.32} L ${W - 18} ${H * 0.62}`}
              stroke={frameStroke}
              strokeWidth={4}
              strokeLinecap="round"
            />
            <Circle cx={W - 18} cy={H * 0.3} r={9} fill={accent} stroke={frameStroke} strokeWidth={2} />
          </G>

          {/* Coin slot at bottom */}
          <Rect
            x={W * 0.4}
            y={H * 0.82}
            width={W * 0.2}
            height={6}
            rx={3}
            fill={tokens.color.neutral700}
          />
        </Svg>
      </View>
    </Animated.View>
  );
}
