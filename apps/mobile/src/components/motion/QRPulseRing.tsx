/**
 * apps/mobile/src/components/motion/QRPulseRing.tsx
 *
 * Hero element for CHECKED_IN ticket detail — wraps the QR card with a
 * pulsing color ring that loops forever. Two concentric rings at slight
 * phase offsets create a "breathing" effect, signaling "this ticket is
 * LIVE, scan me at the gate". Subtle but unmistakable.
 *
 * Color comes from props so callers can theme it (info-blue for CHECKED_IN,
 * success-green for RACEKIT_RECEIVED).
 *
 * Built on Reanimated 3 — the entire animation loop lives on the UI thread,
 * so it stays smooth even when the JS thread is busy fetching data.
 */

import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

export interface QRPulseRingProps {
  children: React.ReactNode;
  /** Ring color — usually a status accent. */
  color: string;
  /** Disable pulse for non-live statuses. Default false. */
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function QRPulseRing({
  children,
  color,
  disabled,
  style,
}: QRPulseRingProps) {
  // Two phase-offset oscillators — gives a layered breathing instead of
  // a single boring pulse.
  const phaseA = useSharedValue(0);
  const phaseB = useSharedValue(0);

  useEffect(() => {
    if (disabled) {
      phaseA.value = 0;
      phaseB.value = 0;
      return;
    }
    // 2.4s per cycle is slow enough to feel calm, fast enough to register.
    phaseA.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
      -1,
      false, // forward-only loop
    );
    // Inner ring uses the `reverse` flag to oscillate out of phase with the
    // outer ring → layered breathing instead of a single synchronized pulse.
    phaseB.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [disabled, phaseA, phaseB]);

  const outerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(phaseA.value, [0, 0.5, 1], [0.35, 0.0, 0.35], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(phaseA.value, [0, 1], [1.0, 1.18], Extrapolation.CLAMP),
      },
    ],
  }));

  const innerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(phaseB.value, [0, 0.5, 1], [0.55, 0.1, 0.55], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(phaseB.value, [0, 1], [1.0, 1.08], Extrapolation.CLAMP),
      },
    ],
  }));

  if (disabled) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={style}>
      {/* Two absolutely-positioned rings under the card. Pointer events off
          so taps pass through to the QR card itself. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 24,
            borderWidth: 6,
            borderColor: color,
          },
          outerStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 24,
            borderWidth: 3,
            borderColor: color,
          },
          innerStyle,
        ]}
      />
      {children}
    </View>
  );
}
