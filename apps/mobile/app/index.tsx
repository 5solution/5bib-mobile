/**
 * apps/mobile/app/index.tsx
 *
 * Splash + auth gate. Uses <Redirect> component (declarative) instead of
 * imperative router.replace() — avoids "Attempted to navigate before mounting
 * the Root Layout component" error from Expo Router.
 */

import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FullScreenLoading } from '../src/components';
import { useAuthStore } from '../src/stores/useAuthStore';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const hydrate = useAuthStore((s) => s.hydrate);

  const [firstLaunchDone, setFirstLaunchDone] = useState<boolean | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    AsyncStorage.getItem('first_launch_done').then((v) => {
      setFirstLaunchDone(v === 'true');
    });
  }, []);

  // Wait until both auth + first-launch flag hydrated
  if (isHydrating || firstLaunchDone === null) {
    return <FullScreenLoading />;
  }

  if (isAuthenticated) {
    return <Redirect href="/home" />;
  }

  // First launch → the parallax onboarding (3 slides, persists both
  // `seenOnboarding` and the legacy `first_launch_done` flag on finish).
  // The old /welcome screen stays routable as a fallback but is no longer
  // the default first-launch destination.
  return <Redirect href={firstLaunchDone ? '/login' : '/onboarding'} />;
}
