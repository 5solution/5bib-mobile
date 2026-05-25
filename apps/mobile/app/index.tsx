/**
 * apps/mobile/app/index.tsx
 *
 * Splash + auth gate. Real impl reads SecureStore for jwt_token →
 *  - has token → redirect /(tabs)/home
 *  - no token + first launch → /(auth)/welcome
 *  - no token + returning → /(auth)/login
 */

import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { FullScreenLoading } from '../src/components';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // const token = await SecureStore.getItemAsync('jwt_token');
    // const firstLaunch = await AsyncStorage.getItem('first_launch_done');
    // if (token) router.replace('/(tabs)/home');
    // else if (!firstLaunch) router.replace('/(auth)/welcome');
    // else router.replace('/(auth)/login');
    setTimeout(() => router.replace('/(auth)/welcome'), 100);
  }, [router]);

  return <FullScreenLoading />;
}
