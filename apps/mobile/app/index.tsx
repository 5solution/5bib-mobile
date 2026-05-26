/**
 * apps/mobile/app/index.tsx
 *
 * Splash + auth gate. Reads persisted Zustand auth state + first-launch flag:
 *  - hydrating → show splash
 *  - authenticated → redirect /(tabs)/home
 *  - not authenticated + first-launch → /(auth)/welcome
 *  - not authenticated + returning → /(auth)/login
 */

import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FullScreenLoading } from '../src/components';
import { useAuthStore } from '../src/stores/useAuthStore';

export default function Index() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrating) return;

    if (isAuthenticated) {
      router.replace('/(tabs)/home');
      return;
    }

    void (async () => {
      const done = await AsyncStorage.getItem('first_launch_done');
      router.replace(done ? '/(auth)/login' : '/(auth)/welcome');
    })();
  }, [isHydrating, isAuthenticated, router]);

  return <FullScreenLoading />;
}
