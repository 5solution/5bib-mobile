/**
 * apps/mobile/app/profile/delete-account.tsx — S-PROFILE-05 Delete Account
 *
 * Apple Guideline 5.1.1(v) compliance: app cho register PHẢI cho delete in-app.
 * Backend hard-delete NGAY khi gọi DELETE /users/delete/forever — mobile UI là
 * defense layer duy nhất.
 *
 * Business Rules:
 *  - BR-AUTH-19: typed confirmation phrase + current password re-entry
 *  - BR-AUTH-20: verify password via POST /login trước khi destructive call
 *  - BR-AUTH-21: clear SecureStore + Zustand + nav reset → /(auth)/welcome
 *  - BR-AUTH-22: Sentry breadcrumb category=account-deletion, KHÔNG log raw email
 */

import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Banner } from '../../src/components/ErrorState';
import { useToast } from '../../src/components/Toast';
import { tokens } from '../../src/theme/tokens';
import { user as sdkUser } from '../../src/sdk/services/user';
import { secureRemove } from '../../src/adapters/secure-storage';
import { TOKEN_KEY } from '../../src/adapters/sdk-init';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { signOutGoogle } from '../../src/adapters/google-signin';
import { addBreadcrumb, captureError } from '../../src/adapters/sentry';

const CONFIRM_PHRASE = 'XÓA TÀI KHOẢN';

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Exact match (case-sensitive, NO trim)
  const phraseMatches = confirmText === CONFIRM_PHRASE;
  const passwordValid = password.length >= 8;
  const canSubmit = phraseMatches && passwordValid && !submitting && !!user?.email;

  const onConfirm = () => {
    Alert.alert(
      t('profile.deleteAccount.finalConfirmTitle'),
      t('profile.deleteAccount.finalConfirmMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteAccount.submit'),
          style: 'destructive',
          onPress: () => {
            void performDelete();
          },
        },
      ],
    );
  };

  const performDelete = async () => {
    if (!user?.email) {
      toast.show({ variant: 'error', message: t('errors.generic') });
      return;
    }
    setPwdErr(null);
    setSubmitting(true);
    try {
      // BR-AUTH-20: verify password by re-logging in. Throws 401 if wrong.
      await sdkUser.login({ email: user.email, password });
    } catch (e: any) {
      setSubmitting(false);
      if (e?.status === 401) {
        setPwdErr(t('profile.deleteAccount.wrongPassword'));
        setPassword('');
      } else {
        toast.show({ variant: 'error', message: t('errors.generic') });
      }
      return;
    }

    try {
      // BR-AUTH-22: breadcrumb only — NEVER log email/userId raw.
      addBreadcrumb({
        category: 'account-deletion',
        message: 'User deleted account',
        level: 'info',
      });

      await sdkUser.deleteAccount();

      // BR-AUTH-21: clear secure + store + sign-out Google + reset nav stack.
      try {
        await signOutGoogle();
      } catch {
        // ignore — not critical
      }
      await secureRemove(TOKEN_KEY);
      await AsyncStorage.removeItem('first_launch_done');
      useAuthStore.getState().logout();

      toast.show({
        variant: 'success',
        message: t('profile.deleteAccount.success'),
      });
      router.replace('/(auth)/welcome');
    } catch (e) {
      captureError(e, { tag: 'account-deletion' });
      toast.show({ variant: 'error', message: t('profile.deleteAccount.failed') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header
        title={t('profile.deleteAccount.title')}
        leading="back"
        onLeadingPress={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={{
          padding: tokens.space[4],
          gap: tokens.space[4],
          paddingBottom: tokens.space[10],
        }}
      >
        <Banner
          variant="error"
          message={t('profile.deleteAccount.warningHeading')}
        />

        <Text
          style={{
            fontSize: tokens.fontSize.bodyMd,
            color: tokens.color.neutral800,
            lineHeight: tokens.lineHeight.bodyMd,
          }}
        >
          {t('profile.deleteAccount.warningIntro')}
        </Text>
        <View style={{ gap: tokens.space[1], paddingLeft: tokens.space[2] }}>
          {[
            'profile.deleteAccount.bulletProfile',
            'profile.deleteAccount.bulletAthletes',
            'profile.deleteAccount.bulletOrders',
            'profile.deleteAccount.bulletTickets',
            'profile.deleteAccount.bulletResults',
            'profile.deleteAccount.bulletStrava',
          ].map((k) => (
            <Text
              key={k}
              style={{
                fontSize: tokens.fontSize.bodyMd,
                color: tokens.color.neutral800,
                lineHeight: tokens.lineHeight.bodyMd,
              }}
            >
              • {t(k)}
            </Text>
          ))}
        </View>

        <Text
          style={{
            fontSize: tokens.fontSize.bodyMd,
            color: tokens.color.error,
            fontWeight: tokens.fontWeight.bold,
            lineHeight: tokens.lineHeight.bodyMd,
          }}
        >
          {t('profile.deleteAccount.cannotUndo')}
        </Text>

        <View
          style={{
            height: 1,
            backgroundColor: tokens.color.neutral200,
            marginVertical: tokens.space[2],
          }}
        />

        <Text
          style={{
            fontSize: tokens.fontSize.bodyMd,
            color: tokens.color.neutral700,
          }}
        >
          {t('profile.deleteAccount.typeToConfirm')}
        </Text>
        <View
          style={{
            backgroundColor: tokens.color.neutral100,
            paddingVertical: tokens.space[2],
            paddingHorizontal: tokens.space[3],
            borderRadius: tokens.radius.md,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: tokens.fontSize.h3,
              fontWeight: tokens.fontWeight.bold,
              color: tokens.color.neutral900,
              letterSpacing: 2,
            }}
            accessibilityLabel={CONFIRM_PHRASE}
          >
            {CONFIRM_PHRASE}
          </Text>
        </View>

        <Input
          label={t('profile.deleteAccount.confirmInputLabel')}
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityHint={t('profile.deleteAccount.confirmInputHint')}
        />

        <Input
          label={t('profile.deleteAccount.passwordLabel')}
          required
          variant="password"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (pwdErr) setPwdErr(null);
          }}
          error={pwdErr ?? undefined}
          textContentType="password"
          autoComplete="current-password"
        />

        <View
          style={{
            flexDirection: 'row',
            gap: tokens.space[3],
            marginTop: tokens.space[3],
          }}
        >
          <View style={{ flex: 1 }}>
            <Button
              variant="outline"
              size="lg"
              fullWidth
              onPress={() => router.back()}
              disabled={submitting}
            >
              {t('common.cancel')}
            </Button>
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!canSubmit}
              loading={submitting}
              onPress={onConfirm}
              accessibilityLabel={t('profile.deleteAccount.submit')}
            >
              <Text
                style={{
                  color: tokens.color.neutral0,
                  fontWeight: tokens.fontWeight.semibold,
                }}
              >
                {submitting
                  ? t('profile.deleteAccount.submitting')
                  : t('profile.deleteAccount.submit')}
              </Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
