/**
 * apps/mobile/app/(tabs)/profile.tsx — S-PROFILE-01
 *
 * Loading | Loaded | Empty avatar | Error fetch (use cached) | Offline.
 * Logout: BR-AUTH-12 — clear SecureStore + Zustand + nav stack → login.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner } from '../../src/components/ErrorState';
import { ListItem } from '../../src/components/ListItem';
import { Button } from '../../src/components/Button';
import { Skeleton } from '../../src/components/Skeleton';
import { FadeSlideIn } from '../../src/components/motion';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import { user as sdkUser } from '../../src/sdk/services/user';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { secureRemove } from '../../src/adapters/secure-storage';
import { TOKEN_KEY } from '../../src/adapters/sdk-init';
import { signOutGoogle } from '../../src/adapters/google-signin';

/**
 * Web footer "Pháp lý" links (G-18) — slugs copied verbatim from
 * selling-web src/app/[locale]/(pub)/footer.tsx. Opened in the in-app
 * webview against production 5bib.com (the legally binding copies).
 */
const LEGAL_LINKS: ReadonlyArray<{ slug: string; key: string }> = [
  { slug: 'quy-che-5bib-com', key: 'terms' },
  { slug: 'chinh-sach-bao-mat-thong-tin', key: 'privacy' },
  { slug: 'chinh-sach-bao-mat-thong-tin-thanh-toan', key: 'paymentPrivacy' },
  { slug: 'chinh-sach-thanh-toan', key: 'payment' },
  { slug: 'thong-tin-ve-chu-so-huu', key: 'owner' },
  { slug: 'quy-trinh-giai-quyet-tranh-chap-khieu-nai', key: 'dispute' },
];

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(!user);
  // 6-tap on the build version opens the dev motion showcase. Easter egg
  // pattern Android uses for build-number tap to enable dev mode.
  const versionTapCount = useRef(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!useAuthStore.getState().isAuthenticated) {
        setLoading(false);
        return;
      }
      try {
        const fresh = await sdkUser.getUserInfo();
        if (!mounted) return;
        useAuthStore.getState().updateUser(fresh);
      } catch {
        // Use cached value silently — Banner shows offline state separately
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const initials = user
    ? user.fullName
        .split(' ')
        .map((s) => s[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : '';

  const performLogout = async () => {
    // BR-AUTH-12: server logout best-effort, never block on it.
    try {
      await sdkUser.logout();
    } catch {
      // ignore — token cleared locally regardless
    }
    try {
      await signOutGoogle();
    } catch {
      // ignore — Google sign-out not critical
    }
    await secureRemove(TOKEN_KEY);
    useAuthStore.getState().logout();
    router.replace('/login');
  };

  const onLogout = () =>
    Alert.alert(t('auth.logoutTitle'), t('auth.logoutMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: () => {
          void performLogout();
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceScreen }}>
      {!online && <Banner variant="warning" message={t('errors.offlineCached')} />}

      <ScrollView contentContainerStyle={{ paddingBottom: tokens.space[10] }}>
        {/* Brand-gradient identity header — avatar bubble + name on the
           gradient, edit CTA as a frosted pill. Replaces the flat white
           header + centered avatar ("toàn màu trắng" fix). */}
        <LinearGradient
          colors={[tokens.color.brandPrimary, tokens.color.brandPrimaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + tokens.space[3],
            paddingBottom: tokens.space[6],
            paddingHorizontal: tokens.space[4],
            borderBottomLeftRadius: tokens.radius.xl,
            borderBottomRightRadius: tokens.radius.xl,
            alignItems: 'center',
            gap: tokens.space[2],
          }}
        >
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
                  backgroundColor: tokens.color.neutral0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...tokens.elevation[2],
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
                  color: tokens.color.neutral0,
                }}
              >
                {user?.fullName}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: tokens.fontSize.bodyMd }}>
                {user?.email}
              </Text>
              {user?.phone && (
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: tokens.fontSize.bodyMd }}>
                  {user.phone}
                </Text>
              )}
              <Pressable
                onPress={() => router.push('/profile/edit')}
                accessibilityRole="button"
                accessibilityLabel={t('profile.editProfile')}
                style={({ pressed }) => ({
                  marginTop: tokens.space[2],
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: tokens.space[4],
                  paddingVertical: tokens.space[2],
                  borderRadius: tokens.radius.full,
                  backgroundColor: pressed
                    ? 'rgba(255,255,255,0.35)'
                    : 'rgba(255,255,255,0.2)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.5)',
                })}
              >
                <Ionicons name="create-outline" size={16} color={tokens.color.neutral0} />
                <Text
                  style={{
                    color: tokens.color.neutral0,
                    fontWeight: tokens.fontWeight.semibold,
                    fontSize: tokens.fontSize.labelMd,
                  }}
                >
                  {t('profile.editProfile')}
                </Text>
              </Pressable>
            </>
          )}
        </LinearGradient>

        {/* Basic info — matches web `/vi/profile` "THÔNG TIN CƠ BẢN" section */}
        {!loading && user && (
          <FadeSlideIn delay={0}>
          <InfoSection title={t('profile.basicInfo')}>
            <InfoRow label={t('profile.fullName')} value={user.fullName} />
            <InfoRow label={t('profile.phone')} value={user.phone} />
            <InfoRow label={t('profile.email')} value={user.email} />
            <InfoRow
              label={t('profile.tshirtSize')}
              value={user.racekit}
              onEdit={() => router.push('/profile/edit')}
            />
            <InfoRow
              label={t('profile.achievements')}
              value={user.achievements}
              onEdit={() => router.push('/profile/edit')}
            />
            <InfoRow
              label={t('profile.club')}
              value={user.club}
              onEdit={() => router.push('/profile/edit')}
            />
          </InfoSection>
          </FadeSlideIn>
        )}

        {/* Identity (KYC) — matches "THÔNG TIN ĐỊNH DANH". Status badge derived
           from idNumber presence (real KYC integration deferred to Phase 2). */}
        {!loading && user && (
          <FadeSlideIn delay={90}>
          <InfoSection
            title={t('profile.identity.title')}
            trailingAction={{
              label: t('profile.identity.detail'),
              onPress: () => router.push('/profile/edit'),
            }}
          >
            <View
              style={{
                marginHorizontal: tokens.space[4],
                paddingVertical: tokens.space[3],
                gap: tokens.space[2],
              }}
            >
              <Text
                style={{
                  fontSize: tokens.fontSize.labelSm,
                  color: tokens.color.neutral500,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {t('profile.identity.status')}
              </Text>
              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: tokens.space[3],
                  paddingVertical: 6,
                  borderRadius: tokens.radius.full,
                  backgroundColor: user.idNumber ? '#DCFCE7' /* green-100 */ : '#FEE2E2' /* red-100 */,
                }}
              >
                <Text
                  style={{
                    color: user.idNumber ? tokens.color.success : tokens.color.error,
                    fontWeight: tokens.fontWeight.semibold,
                    fontSize: tokens.fontSize.labelSm,
                  }}
                >
                  {user.idNumber
                    ? t('profile.identity.verified')
                    : t('profile.identity.notVerified')}
                </Text>
              </View>
              {!user.idNumber && (
                <Text
                  style={{
                    color: tokens.color.neutral600,
                    fontSize: tokens.fontSize.bodySm,
                  }}
                >
                  {t('profile.identity.notVerifiedHint')}
                </Text>
              )}
              <Text
                style={{
                  color: tokens.color.neutral500,
                  fontSize: tokens.fontSize.bodySm,
                  marginTop: tokens.space[2],
                }}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={13}
                  color={tokens.color.neutral500}
                />{' '}
                {t('profile.identity.secure')}
              </Text>
            </View>
          </InfoSection>
          </FadeSlideIn>
        )}

        {/* Medical info — matches "THÔNG TIN Y TẾ". All fields editable from
           the Edit Profile screen so we surface them here as read-only. */}
        {!loading && user && (
          <FadeSlideIn delay={180}>
          <InfoSection title={t('profile.medical.title')}>
            <InfoRow
              label={t('profile.medical.sosPhone')}
              value={user.sosPhone}
              onEdit={() => router.push('/profile/edit')}
            />
            <InfoRow
              label={t('profile.medical.info')}
              value={user.medicalInfo}
              onEdit={() => router.push('/profile/edit')}
            />
            <InfoRow
              label={t('profile.medical.bloodGroup')}
              value={user.bloodGroup}
              onEdit={() => router.push('/profile/edit')}
            />
            <InfoRow label={t('profile.medical.height')} value={user.height} />
            <InfoRow label={t('profile.medical.weight')} value={user.weight} />
          </InfoSection>
          </FadeSlideIn>
        )}

        <FadeSlideIn delay={240}>
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
            leading={<Ionicons name="pencil-outline" size={20} color={tokens.color.neutral600} />}
            title={t('profile.editProfile')}
            onPress={() => router.push('/profile/edit')}
            accessibilityLabel={t('profile.editProfile')}
          />
          <ListItem
            leading={<Ionicons name="image-outline" size={20} color={tokens.color.neutral600} />}
            title={t('profile.changeAvatar')}
            onPress={() => router.push('/profile/change-avatar')}
            accessibilityLabel={t('profile.changeAvatar')}
          />
          <ListItem
            leading={<Ionicons name="lock-closed-outline" size={20} color={tokens.color.neutral600} />}
            title={t('profile.changePassword.title')}
            onPress={() => router.push('/profile/change-password')}
            accessibilityLabel={t('profile.changePassword.title')}
          />
          <ListItem
            leading={<Ionicons name="log-out-outline" size={20} color={tokens.color.error} />}
            title={t('auth.logout')}
            onPress={onLogout}
            destructive
            accessibilityLabel={t('auth.logout')}
          />
          <ListItem
            leading={<Ionicons name="globe-outline" size={20} color={tokens.color.neutral600} />}
            title={t('common.language')}
            trailingText={
              i18n.language === 'vi' ? 'Tiếng Việt' : i18n.language === 'en' ? 'English' : 'Deutsch'
            }
            onPress={() => {/* open language bottom sheet */}}
          />
          <ListItem
            leading={<Ionicons name="notifications-outline" size={20} color={tokens.color.neutral600} />}
            title={t('profile.notifications')}
            onPress={() => {/* /settings/notifications */}}
          />
          <ListItem
            leading={<Ionicons name="walk-outline" size={20} color={tokens.color.neutral600} />}
            title={t('result.historyTitle')}
            onPress={() => router.push('/result/race-history')}
          />
          <ListItem
            leading={<Ionicons name="information-circle-outline" size={20} color={tokens.color.neutral600} />}
            title={t('profile.about')}
            onPress={() => {}}
          />
          <ListItem
            leading={<Ionicons name="star-outline" size={20} color={tokens.color.neutral600} />}
            title={t('profile.rateApp')}
            onPress={() => {}}
          />
          {/* S-PROFILE-05: Apple Guideline 5.1.1(v) — delete account in-app */}
          <ListItem
            leading={<Ionicons name="trash-outline" size={20} color={tokens.color.error} />}
            title={t('profile.deleteAccount.menuTitle')}
            onPress={() => router.push('/profile/delete-account')}
            destructive
            accessibilityLabel={t('profile.deleteAccount.menuTitle')}
          />

          {/* Pháp lý — web footer parity (G-18). 6 policy pages opened in
             the in-app webview against the production site (those are the
             legally binding documents; identical paths exist on dev). */}
          <Text
            style={{
              paddingHorizontal: tokens.space[4],
              fontSize: tokens.fontSize.labelSm,
              fontWeight: tokens.fontWeight.semibold,
              color: tokens.color.neutral500,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginTop: tokens.space[5],
              marginBottom: tokens.space[2],
            }}
            accessibilityRole="header"
          >
            {t('profile.legal.title')}
          </Text>
          {LEGAL_LINKS.map((l) => (
            <ListItem
              key={l.slug}
              leading={<Ionicons name="document-outline" size={20} color={tokens.color.neutral600} />}
              title={t(`profile.legal.${l.key}`)}
              onPress={() =>
                router.push({
                  pathname: '/result/webview',
                  params: { url: `https://5bib.com/vi/privacy/${l.slug}` },
                })
              }
              accessibilityLabel={t(`profile.legal.${l.key}`)}
            />
          ))}
        </View>
        </FadeSlideIn>

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
            onPress={() => {
              // 6-tap on the version label opens the dev motion showcase.
              // Same easter-egg pattern Android uses for the build-number tap.
              versionTapCount.current += 1;
              if (versionTapCount.current >= 6) {
                versionTapCount.current = 0;
                router.push('/dev/motion-showcase');
              }
            }}
          >
            v2.0.0 (build 1)
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Section card matching web's profile blocks. Renders a section header
 * (uppercase, neutral) + content + optional "Chi tiết"-style right action.
 */
function InfoSection({
  title,
  children,
  trailingAction,
}: {
  title: string;
  children: React.ReactNode;
  trailingAction?: { label: string; onPress: () => void };
}) {
  return (
    <View style={{ paddingTop: tokens.space[4] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: tokens.space[4],
          marginBottom: tokens.space[2],
        }}
      >
        <Text
          style={{
            fontSize: tokens.fontSize.labelSm,
            fontWeight: tokens.fontWeight.semibold,
            color: tokens.color.neutral500,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          — {title}
        </Text>
        {trailingAction ? (
          <Text
            onPress={trailingAction.onPress}
            style={{
              color: tokens.color.brandPrimary,
              fontWeight: tokens.fontWeight.semibold,
              fontSize: tokens.fontSize.bodySm,
            }}
            accessibilityRole="link"
          >
            {trailingAction.label} ›
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/**
 * Two-line row: label on top (uppercase neutral) + value below. Tap pencil
 * icon (when `onEdit` provided) jumps to the edit screen. Missing/empty
 * values render as `N/A` to mirror web's empty-state display.
 */
function InfoRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value?: string | null;
  onEdit?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: tokens.space[4],
        paddingVertical: tokens.space[3],
        borderBottomWidth: 1,
        borderBottomColor: tokens.color.neutral100,
        gap: tokens.space[3],
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            fontSize: tokens.fontSize.labelSm,
            color: tokens.color.neutral500,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: tokens.fontSize.bodyMd,
            color: value ? tokens.color.neutral900 : tokens.color.neutral400,
          }}
        >
          {value && value.trim() ? value : 'N/A'}
        </Text>
      </View>
      {onEdit ? (
        <Ionicons
          name="pencil-outline"
          size={18}
          color={tokens.color.neutral500}
          onPress={onEdit}
          accessibilityRole="button"
        />
      ) : null}
    </View>
  );
}
