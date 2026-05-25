/**
 * apps/mobile/src/components/QRScannerView.tsx
 *
 * Spec: design-system #18 — full-screen camera for QR scan.
 * Note: EPIC-7 staff check-in was DROPPED, but this component remains
 * for general scan use (e.g. quick BIB lookup).
 */

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { tokens } from '../theme/tokens';

let CameraView: any;
let useCameraPermissions: any;
try {
  ({ CameraView, useCameraPermissions } = require('expo-camera'));
} catch {}

export interface QRScannerViewProps {
  onScan: (value: string) => void;
  onClose: () => void;
  instruction?: string;
}

export function QRScannerView({
  onScan,
  onClose,
  instruction = 'Đưa mã QR vào khung',
}: QRScannerViewProps) {
  const [permission, requestPermission] = useCameraPermissions?.() ?? [null, () => {}];
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);

  if (!CameraView) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff' }}>
          expo-camera not installed. Run: expo install expo-camera
        </Text>
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tokens.color.surfaceBg,
          paddingHorizontal: tokens.space[6],
          gap: tokens.space[4],
        }}
      >
        <Text style={{ fontSize: 48 }}>📷</Text>
        <Text
          style={{
            fontSize: tokens.fontSize.h3,
            fontWeight: tokens.fontWeight.semibold,
            color: tokens.color.neutral900,
            textAlign: 'center',
          }}
        >
          5BIB cần quyền camera để quét QR
        </Text>
        <Pressable
          onPress={requestPermission}
          style={{
            backgroundColor: tokens.color.brandPrimary,
            paddingHorizontal: tokens.space[5],
            paddingVertical: tokens.space[3],
            borderRadius: tokens.radius.lg,
          }}
          accessibilityRole="button"
          accessibilityLabel="Cho phép camera"
        >
          <Text
            style={{ color: tokens.color.neutral0, fontWeight: tokens.fontWeight.semibold }}
          >
            Cho phép camera
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={
          scanned
            ? undefined
            : (result: any) => {
                setScanned(true);
                onScan(result?.data ?? '');
              }
        }
      />
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Đóng"
        hitSlop={12}
        style={{
          position: 'absolute',
          top: 60,
          left: 20,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 22 }}>✕</Text>
      </Pressable>

      <View
        pointerEvents="none"
        style={{
          ...{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 280,
            height: 280,
            borderWidth: 0,
          }}
        >
          {/* corner brackets */}
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
            <View
              key={c}
              style={{
                position: 'absolute',
                width: 28,
                height: 28,
                borderColor: tokens.color.brandPrimary,
                ...(c === 'tl' && { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 }),
                ...(c === 'tr' && { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 }),
                ...(c === 'bl' && { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 }),
                ...(c === 'br' && {
                  bottom: 0,
                  right: 0,
                  borderBottomWidth: 4,
                  borderRightWidth: 4,
                }),
              }}
            />
          ))}
        </View>
      </View>

      <View
        style={{
          position: 'absolute',
          bottom: 80,
          left: 0,
          right: 0,
          alignItems: 'center',
          gap: tokens.space[4],
        }}
      >
        <Text
          style={{
            color: '#fff',
            fontSize: tokens.fontSize.bodyLg,
            backgroundColor: 'rgba(0,0,0,0.5)',
            paddingHorizontal: tokens.space[3],
            paddingVertical: tokens.space[2],
            borderRadius: tokens.radius.full,
          }}
        >
          {instruction}
        </Text>
        <Pressable
          onPress={() => setTorch((t) => !t)}
          accessibilityRole="button"
          accessibilityLabel={torch ? 'Tắt đèn pin' : 'Bật đèn pin'}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: torch ? tokens.color.warning : 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 28 }}>⚡</Text>
        </Pressable>
      </View>
    </View>
  );
}
