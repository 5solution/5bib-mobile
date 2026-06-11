/**
 * apps/mobile/src/components/QRDisplayCard.tsx
 *
 * Spec: design-system #16 — CRITICAL race-day ticket display.
 * - QR 240×240
 * - Force screen brightness 100% on mount (expo-brightness)
 * - Keep screen awake (expo-keep-awake)
 * - Online/offline indicator
 * - Cached offline (SQLite) — caller passes data
 */

import React, { useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens } from '../theme/tokens';

// Optional native deps — guarded so file still type-checks if not installed.
// In real Expo app, install:
//   expo install expo-brightness expo-keep-awake react-native-qrcode-svg
let Brightness: any;
let KeepAwake: any;
let QRCode: any;
try {
  Brightness = require('expo-brightness');
} catch {}
try {
  KeepAwake = require('expo-keep-awake');
} catch {}
try {
  QRCode = require('react-native-qrcode-svg').default;
} catch {}

export interface QRDisplayCardProps {
  /** The string value encoded in the QR. Comes from `ticket.value`. */
  value: string;
  bib: string;
  raceName: string;
  /** Course distance + date as a single line, e.g. "5 km · 15/03/2026" */
  courseAndDate: string;
  /** Online indicator. If false → show "Ngoại tuyến — Dữ liệu từ {lastSync}". */
  online: boolean;
  lastSyncLabel?: string;
}

export function QRDisplayCard({
  value,
  bib,
  raceName,
  courseAndDate,
  online,
  lastSyncLabel,
}: QRDisplayCardProps) {
  useEffect(() => {
    let prevBrightness: number | null = null;
    let activated = false;
    (async () => {
      try {
        if (Brightness?.getBrightnessAsync && Brightness?.setBrightnessAsync) {
          prevBrightness = await Brightness.getBrightnessAsync();
          await Brightness.setBrightnessAsync(1.0);
        }
        if (KeepAwake?.activateKeepAwakeAsync) {
          await KeepAwake.activateKeepAwakeAsync('qr-display');
          activated = true;
        }
      } catch {
        // Permission denied or unsupported — silent fail, QR still renders.
      }
    })();
    return () => {
      if (prevBrightness != null && Brightness?.setBrightnessAsync) {
        Brightness.setBrightnessAsync(prevBrightness).catch(() => {});
      }
      if (activated && KeepAwake?.deactivateKeepAwake) {
        KeepAwake.deactivateKeepAwake('qr-display');
      }
    };
  }, []);

  return (
    <View
      style={{
        backgroundColor: tokens.color.surfaceCard,
        borderRadius: tokens.radius.xl,
        overflow: 'hidden',
        ...tokens.elevation[2],
      }}
      accessibilityRole="image"
      accessibilityLabel={`Vé BIB ${bib} cho giải ${raceName}, ${courseAndDate}`}
    >
      {/* Ticket-stub header — race identity on the brand gradient, like a
         physical race bib. The white QR zone below stays max-contrast for
         scanners. */}
      <LinearGradient
        colors={[tokens.color.brandPrimary, tokens.color.brandPrimaryDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: tokens.space[4],
          paddingHorizontal: tokens.space[5],
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Text
          style={{
            fontSize: tokens.fontSize.h1,
            fontWeight: tokens.fontWeight.bold,
            color: tokens.color.neutral0,
            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
            letterSpacing: 1,
          }}
        >
          BIB {bib}
        </Text>
        <Text
          style={{
            fontSize: tokens.fontSize.h4,
            fontWeight: tokens.fontWeight.semibold,
            color: tokens.color.neutral0,
            textAlign: 'center',
          }}
          numberOfLines={2}
        >
          {raceName}
        </Text>
        {!!courseAndDate && (
          <Text
            style={{
              fontSize: tokens.fontSize.bodySm,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            {courseAndDate}
          </Text>
        )}
      </LinearGradient>

      {/* Perforation row — the visual "tear line" between stub and QR. */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: tokens.color.brandPrimaryDeep,
        }}
      >
        {Array.from({ length: 14 }, (_, i) => (
          <View
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: tokens.color.surfaceCard,
              marginTop: -4,
            }}
          />
        ))}
      </View>

      <View style={{ alignItems: 'center', gap: tokens.space[3], padding: tokens.space[5] }}>
        <View
          style={{
            width: 256,
            height: 256,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tokens.color.neutral0,
            borderRadius: tokens.radius.lg,
            padding: 8,
          }}
        >
          {QRCode ? (
            <QRCode value={value} size={240} backgroundColor="white" color="#000000" />
          ) : (
            <View
              style={{
                width: 240,
                height: 240,
                backgroundColor: tokens.color.neutral100,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 14, color: tokens.color.neutral500 }}>
                QR ({value.slice(0, 12)}…)
              </Text>
            </View>
          )}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.space[1],
            paddingHorizontal: tokens.space[3],
            paddingVertical: tokens.space[1],
            borderRadius: tokens.radius.full,
            backgroundColor: online ? tokens.color.successBg : tokens.color.neutral100,
          }}
          accessibilityRole="text"
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: online ? tokens.color.success : tokens.color.neutral400,
            }}
          />
          <Text
            style={{
              fontSize: tokens.fontSize.labelSm,
              fontWeight: tokens.fontWeight.semibold,
              color: online ? tokens.color.success : tokens.color.neutral600,
            }}
          >
            {online ? 'Trực tuyến' : `Ngoại tuyến${lastSyncLabel ? ' — ' + lastSyncLabel : ''}`}
          </Text>
        </View>
      </View>
    </View>
  );
}
