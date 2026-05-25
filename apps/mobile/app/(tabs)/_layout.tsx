/**
 * apps/mobile/app/(tabs)/_layout.tsx
 *
 * Bottom-tab layout — Home, Tickets, Orders, Profile.
 * Real app: gate behind authStore.user — if null → redirect /(auth)/login.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { TabBar } from '../../src/components/TabBar';

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(p) => <TabBar {...p} />}>
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarLabel: 'Home' }} />
      <Tabs.Screen name="tickets" options={{ title: t('tickets.tabTitle'), tabBarLabel: t('tickets.tabTitle') }} />
      <Tabs.Screen name="orders" options={{ title: t('orders.tabTitle'), tabBarLabel: t('orders.tabTitle') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile.title'), tabBarLabel: t('profile.title') }} />
    </Tabs>
  );
}
