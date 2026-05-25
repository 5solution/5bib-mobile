/**
 * apps/mobile/app/(tabs)/profile.tsx — S-PROFILE-01
 *
 * Loading | Loaded | Empty avatar | Error fetch (use cached) | Offline.
 * Logout: BR-AUTH-12 — clear SecureStore + Zustand + nav stack → login.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { ListItem } from '../../src/components/ListItem';
import { Button } from '../../src/components/Button';
import { Skeleton } from '../../src/components/Skeleton';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import type { User } from '../../src/sdk/models';

const MOCK_USER: User = {
  id: 'u1',
  email: 'a@example.com',
  fullName: 'Nguyễn Văn A',
  role: 'ROLE_NORMAL_USER',
  avatar: null,
  locale: 'vi',
  phone: '+84 912 345 678',
};

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const online = useOnline();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await new Promise((r) => setTimeout(r, 400));
      setUser(MOCK_USER);
      setLoading(false);
    })();
  }, []);

  const initials = user
    ? user.fullName
        .split(' ')
        .map((s) => s[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : '';

  const onLogout = () =>
    Alert.alert(t('auth.logoutTitle'), t('auth.logoutMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: () => {
          // SecureStore.deleteItemAsync('jwt_token'); authStore.clear();
          router.replace('/(auth)/login');
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header title={t('profile.title')} largeTitle leading="none" />
      {!online && <Banner variant="warning" message={t('errors.offlineCached')} />}

      <ScrollView contentContainerStyle={{ paddingBottom: tokens.space[10] }}>
        {/* Avatar block */}
        <View style={{ alignItems: 'center', paddingVertical: tokens.space[5], gap: tokens.space[2] }}>
          {loading ? (
            <>
              <Skeleton width={96} height={96} borderRadius={48} />
              <Skeleton width={160} height={20} />
              <Skeleton width={200} height={14} />
            </>
          ) : (
            <>
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: tokens.color.brandPrimaryLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: tokens.color.surfaceBg,
                  ...tokens.elevation[1],
                }}
                accessibilityLabel={`Avatar ${user?.fullName}`}
              >
                <Text
                  style={{
                    color: tokens.color.brandPrimary,
                    fontSize: 32,
                    fontWeight: tokens.fontWeight.bold,
                  }}
                >
                  {initials}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: tokens.fontSize.h2,
                  fontWeight: tokens.fontWeight.bold,
                  color: tokens.color.neutral900,
                }}
              >
                {user?.fullName}
              </Text>
              <Text style={{ color: tokens.color.neutral600, fontSize: tokens.fontSize.bodyMd }}>
                {user?.email}
              </Text>
              {user?.phone && (
                <Text style={{ color: tokens.color.neutral600, fontSize: tokens.fontSize.bodyMd }}>
                  {user.phone}
                </Text>
              )}
              <View style={{ marginTop: tokens.space[3] }}>
                <Button variant="outline" size="md" onPress={() => router.push('/profile/edit')}>
                  {t('profile.editProfile')}
                </Button>
              </View>
            </>
          )}
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: tokens.color.neutral200,
            marginHorizontal: tokens.space[4],
          }}
        />

        <View style={{ paddingTop: tokens.space[3] }}>
          <Text
            style={{
              paddingHorizontal: tokens.space[4],
              fontSize: tokens.fontSize.labelSm,
              fontWeight: tokens.fontWeight.semibold,
              color: tokens.color.neutral500,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: tokens.space[2],
            }}
          >
            {t('profile.settings')}
          </Text>

          <ListItem
            leading={<Text style={{ fontSize: 20 }}>✏️</Text>}
            title={t('profile.editProfile')}
            onPress={() => router.push('/profile/edit')}
            accessibilityLabel={t('profile.editProfile')}
          />
          <ListItem
            leading={<Text style={{ fontSize: 20 }}>🖼️</Text>}
            title={t('profile.changeAvatar')}
            onPress={() => router.push('/profile/change-avatar')}
            accessibilityLabel={t('profile.changeAvatar')}
          />
          <ListItem
            leading={<Text style={{ fontSize: 20 }}>🚪</Text>}
            title={t('auth.logout')}
            onPress={onLogout}
            destructive
            accessibilityLabel={t('auth.logout')}
          />
          <ListItem
            leading={<Text style={{ fontSize: 20 }}>🌐</Text>}
            title={t('common.language')}
            trailingText={
              i18n.language === 'vi' ? 'Tiếng Việt' : i18n.language === 'en' ? 'English' : 'Deutsch'
            }
            onPress={() => {/* open language bottom sheet */}}
          />
          <ListItem
            leading={<Text style={{ fontSize: 20 }}>🔔</Text>}
            title={t('profile.notifications')}
            onPress={() => {/* /settings/notifications */}}
          />
          <ListItem
            leading={<Text style={{ fontSize: 20 }}>🏃</Text>}
            title={t('result.historyTitle')}
            onPress={() => router.push('/result/race-history')}
          />
          <ListItem
            leading={<Text style={{ fontSize: 20 }}>🔒</Text>}
            title={t('profile.privacy')}
            onPress={() => {}}
          />
          <ListItem
            leading={<Text style={{ fontSize: 20 }}>ℹ️</Text>}
            title={t('profile.about')}
            onPress={() => {}}
          />
          <ListItem
            leading={<Text style={{ fontSize: 20 }}>⭐</Text>}
            title={t('profile.rateApp')}
            onPress={() => {}}
          />
        </View>

        <View
          style={{ paddingHorizontal: tokens.space[4], paddingTop: tokens.space[5] }}
        >
          <Button variant="outline" size="lg" fullWidth onPress={onLogout}>
            <Text style={{ color: tokens.color.error, fontWeight: tokens.fontWeight.semibold }}>
              {t('auth.logout')}
            </Text>
          </Button>
          <Text
            style={{
              textAlign: 'center',
              fontSize: tokens.fontSize.bodySm,
              color: tokens.color.neutral400,
              marginTop: tokens.space[3],
            }}
          >
            v2.0.0 (build 1)
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
