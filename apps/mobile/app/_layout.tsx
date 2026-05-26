/**
 * apps/mobile/app/_layout.tsx
 *
 * Root Expo Router layout.
 * - Tamagui provider
 * - SafeAreaProvider
 * - GestureHandler root view (required for bottom sheet)
 * - i18n init (side-effect import)
 * - ToastProvider
 * - SDK Fetcher init (BEFORE Google Sign-In init — BR-AUTH-15)
 * - AUTH_EXPIRED listener — BR-AUTH-04: 401 → logout store + redirect Login
 * - Auth gate handled by individual group layouts (auth vs tabs)
 */

import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { TamaguiProvider } from 'tamagui';

import tamaguiConfig from '../src/theme/tamagui.config';
import { ToastProvider, useToast } from '../src/components';
import { initSentry } from '../src/adapters/sentry';
import { initGoogleSignIn } from '../src/adapters/google-signin';
import { initSdk } from '../src/adapters/sdk-init';
import { eventBus } from '../src/adapters/event-bus';
import { useAuthStore } from '../src/stores/useAuthStore';
import '../src/i18n';

// Init Sentry BEFORE component render — captures errors from app boot.
initSentry();
// Init SDK Fetcher BEFORE any service call. Synchronous-safe (no network here).
void initSdk();
// Init Google Sign-In SDK (config via app.config.js + adapters/google-signin.ts).
initGoogleSignIn();

function AuthExpiredListener() {
  const router = useRouter();
  const toast = useToast();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    // BR-AUTH-04: SDK emits AUTH_EXPIRED on 401 → clear store + redirect login.
    const unsub = eventBus.on('AUTH_EXPIRED', () => {
      logout();
      toast.show({ variant: 'warning', message: 'Phiên đăng nhập hết hạn' });
      router.replace('/(auth)/login');
    });
    return unsub;
  }, [router, toast, logout]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
          <BottomSheetModalProvider>
            <ToastProvider>
              <AuthExpiredListener />
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
                {/* S-PROFILE-05 Delete Account — Apple Guideline 5.1.1(v) */}
                <Stack.Screen name="profile/delete-account" />
              </Stack>
            </ToastProvider>
          </BottomSheetModalProvider>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
