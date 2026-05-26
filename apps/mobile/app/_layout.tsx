/**
 * apps/mobile/app/_layout.tsx
 *
 * Root Expo Router layout.
 * - Tamagui provider
 * - SafeAreaProvider
 * - GestureHandler root view (required for bottom sheet)
 * - i18n init (side-effect import)
 * - ToastProvider
 * - Auth gate handled by individual group layouts (auth vs tabs)
 */

import 'react-native-gesture-handler';
import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { TamaguiProvider } from 'tamagui';

import tamaguiConfig from '../src/theme/tamagui.config';
import { ToastProvider } from '../src/components';
import { initSentry } from '../src/adapters/sentry';
import '../src/i18n';

// Init Sentry BEFORE component render — captures errors from app boot.
// DSN switched per APP_ENV via app.config.js extra.sentryDsn.
initSentry();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
          <BottomSheetModalProvider>
            <ToastProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="checkout/payment-webview"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="e-waiver/sign"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="result/webview"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                {/* S-TICKETS-06 Rolling BIB — gamification feel */}
                <Stack.Screen
                  name="tickets/[id]/rolling-bib"
                  options={{ animation: 'slide_from_bottom' }}
                />
                {/* S-PROFILE-02 Edit Profile */}
                <Stack.Screen name="profile/edit" />
                {/* S-PROFILE-03 Change Avatar — modal bottom sheet feel */}
                <Stack.Screen
                  name="profile/change-avatar"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
              </Stack>
            </ToastProvider>
          </BottomSheetModalProvider>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
