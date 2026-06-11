/**
 * apps/mobile/src/components/domain/CountdownRing.tsx
 *
 * Apple-Activity-style countdown for race day. Replaces the old chunk of
 * 5 numbers separated by colons with 5 stroked progress rings — months,
 * days, hours, minutes, seconds — each filling clockwise as its unit
 * elapses. The seconds ring updates every frame so the whole composition
 * feels alive instead of ticking.
 *
 * Urgency color tier is driven by the *total* days remaining, not the
 * individual rings:
 *   > 60 days   → brand blue (calm — "save the date")
 *   30–60 days  → success green ("preparing")
 *   7–30 days   → warning amber ("getting close")
 *   1–7 days    → secondary orange ("hype week")
 *   < 1 day     → magenta ("RACE DAY")
 *
 * Built on react-native-svg + Reanimated 3. The animated stroke-dashoffset
 * runs on the UI thread so we don't pay JS cost for the per-frame redraw.
 */

import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RingProps {
  /** 0–1 progress (1 = full circle). */
  progress: number;
  /** Number to render in centre. */
  value: number;
  label: string;
  color: string;
  size?: number;
}

function Ring({ progress, value, label, color, size = 56 }: RingProps) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = useSharedValue(circumference);

  useEffect(() => {
    offset.value = withTiming(circumference * (1 - progress), {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, circumference, offset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  return (
    <View style={{ width: size, alignItems: 'center', gap: 2 }}>
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          {/* Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={tokens.color.neutral200}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            // Start at 12 o'clock instead of 3 o'clock — feels more natural.
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Text
          style={{
            fontSize: tokens.fontSize.bodyLg,
            fontWeight: tokens.fontWeight.bold,
            color: tokens.color.neutral900,
            fontFamily: 'Menlo',
          }}
        >
          {String(value).padStart(2, '0')}
        </Text>
      </View>
      <Text style={{ fontSize: 9, color: tokens.color.neutral500, letterSpacing: 0.6 }}>
        {label}
      </Text>
    </View>
  );
}

function urgencyColor(daysLeft: number): string {
  if (daysLeft < 1) return tokens.color.magenta;
  if (daysLeft <= 7) return tokens.color.brandSecondary;
  if (daysLeft <= 30) return tokens.color.warning;
  if (daysLeft <= 60) return tokens.color.success;
  return tokens.color.brandPrimary;
}

export interface CountdownRingProps {
  /** Race start as ISO string. */
  targetIso: string;
  /** Optional override of intro label (default Vietnamese). */
  label?: string;
}

export function CountdownRing({ targetIso, label = 'RACE DAY BẮT ĐẦU TRONG' }: CountdownRingProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(targetIso).getTime();
  if (!Number.isFinite(target)) return null;
  const diff = Math.max(0, target - now);
  if (diff <= 0) return null;

  const totalSec = Math.floor(diff / 1000);
  const months = Math.floor(totalSec / (30 * 86400));
  const days = Math.floor((totalSec % (30 * 86400)) / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const totalDays = totalSec / 86400;
  const color = urgencyColor(totalDays);

  // Each ring shows progress through its own unit:
  //   month — how far through a 30-day cycle we are
  //   day   — fraction of a day elapsed
  //   etc.
  // This is the same trick as Apple's Activity rings: each is meaningful on
  // its own scale, not a fraction of "time until race".
  const monthProgress = (days % 30) / 30;
  const dayProgress = (hours % 24) / 24;
  const hourProgress = (minutes % 60) / 60;
  const minuteProgress = (seconds % 60) / 60;
  const secondProgress = ((Date.now() % 1000) / 1000); // sub-second hint

  return (
    <View
      style={{
        padding: tokens.space[4],
        borderRadius: tokens.radius.lg,
        backgroundColor: tokens.color.neutral50,
        gap: tokens.space[3],
        ...tokens.elevation[1],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] }}>
        <Ionicons name="timer-outline" size={13} color={tokens.color.neutral600} />
        <Text style={{ fontSize: 11, color: tokens.color.neutral600, letterSpacing: 1 }}>
          {label}
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}
      >
        <Ring progress={monthProgress} value={months} label="THÁNG" color={color} />
        <Ring progress={dayProgress} value={days} label="NGÀY" color={color} />
        <Ring progress={hourProgress} value={hours} label="GIỜ" color={color} />
        <Ring progress={minuteProgress} value={minutes} label="PHÚT" color={color} />
        <Ring progress={secondProgress} value={seconds} label="GIÂY" color={color} />
      </View>
    </View>
  );
}
