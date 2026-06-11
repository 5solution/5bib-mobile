/**
 * apps/mobile/app/(auth)/login.tsx — S-AUTH-02
 *
 * UI states covered:
 *  - Initial / Filled / Submitting / Error 401 / Error 423 (locked) / Offline / Success
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';

import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Banner } from '../../src/components/ErrorState';
import { useToast } from '../../src/components/Toast';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import { user as sdkUser } from '../../src/sdk/services/user';
import { secureSet } from '../../src/adapters/secure-storage';
import { TOKEN_KEY } from '../../src/adapters/sdk-init';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { signInWithGoogle } from '../../src/adapters/google-signin';
import { addBreadcrumb, captureError } from '../../src/adapters/sentry';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const online = useOnline();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lockSeconds, setLockSeconds] = useState<number | null>(null);

  const formValid =
    EMAIL_RX.test(email.trim()) && password.length >= 8 && !lockSeconds && online;

  const validate = () => {
    let ok = true;
    if (!EMAIL_RX.test(email.trim())) {
      setEmailErr(t('validation.emailInvalid'));
      ok = false;
    } else setEmailErr(null);
    if (password.length < 8) {
      setPwdErr(t('validation.passwordTooShort'));
      ok = false;
    } else setPwdErr(null);
    return ok;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await sdkUser.login({ email: email.trim(), password });
      await secureSet(TOKEN_KEY, result.token);
      useAuthStore.getState().login(result.token, result.user);
      router.replace('/home');
    } catch (e: any) {
      if (e?.status === 401) {
        toast.show({ variant: 'error', message: t('auth.loginError401') });
        setPassword('');
      } else if (e?.status === 423) {
        const mins = Math.ceil((e?.retryAfterSeconds ?? 900) / 60);
        setLockSeconds(e?.retryAfterSeconds ?? 900);
        toast.show({ variant: 'warning', message: t('auth.accountLocked', { minutes: mins }) });
      } else {
        // Try to surface backend error message (unwrap response wrapper).
        // Backend shapes: { error: { code, message } } OR { error: { error: { code, message } } }
        const resp = e?.response as { error?: { message?: string; error?: { code?: number; message?: string } } } | undefined;
        const inner = resp?.error?.error ?? resp?.error;
        const msg = inner?.message;
        let userMsg = t('errors.generic');
        // Verified live 2026-06-11 against dapi:
        //   wrong password (existing account) → 400 "handleBaseException"
        //   nonexistent email                → "Invalid credential"
        // Both mean BAD CREDENTIALS. The old mapping showed "Tài khoản chưa
        // kích hoạt" for handleBaseException, which misled users into
        // hunting for a verification email when they just typo'd a password.
        if (msg === 'handleBaseException' || msg === 'Invalid credential') {
          userMsg = t('auth.loginError401');
          setPassword('');
        } else if (typeof msg === 'string' && msg.length < 200) {
          userMsg = msg;
        }
        toast.show({ variant: 'error', message: userMsg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    addBreadcrumb({ category: 'auth', message: 'google-login tap', level: 'info' });
    const r = await signInWithGoogle();
    if (!r.success) {
      if (r.reason === 'cancelled' || r.reason === 'in_progress') return;
      toast.show({ variant: 'error', message: t('auth.loginGoogleFailed') });
      return;
    }
    setSubmitting(true);
    try {
      const result = await sdkUser.googleLogin({ idToken: r.idToken });
      await secureSet(TOKEN_KEY, result.token);
      useAuthStore.getState().login(result.token, result.user);
      router.replace('/home');
    } catch (e) {
      captureError(e, { tag: 'google-login-backend' });
      toast.show({ variant: 'error', message: t('errors.generic') });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApple = async () => {
    addBreadcrumb({ category: 'auth', message: 'apple-login tap', level: 'info' });
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        toast.show({ variant: 'error', message: t('errors.generic') });
        return;
      }
      setSubmitting(true);
      const result = await sdkUser.appleLogin({
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode ?? undefined,
        fullName: credential.fullName
          ? {
              givenName: credential.fullName.givenName ?? undefined,
              familyName: credential.fullName.familyName ?? undefined,
            }
          : undefined,
        email: credential.email ?? undefined,
      });
      await secureSet(TOKEN_KEY, result.token);
      useAuthStore.getState().login(result.token, result.user);
      router.replace('/home');
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') return;
      captureError(e, { tag: 'apple-login' });
      toast.show({ variant: 'error', message: t('errors.generic') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}
    >
      {!online && <Banner variant="warning" message={t('errors.network')} />}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + tokens.space[4],
          paddingHorizontal: tokens.space[4],
          paddingBottom: insets.bottom + tokens.space[6],
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: tokens.space[6] }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              backgroundColor: tokens.color.brandPrimary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: tokens.space[4],
            }}
          >
            <Text
              style={{
                color: tokens.color.neutral0,
                fontSize: 32,
                fontWeight: tokens.fontWeight.bold,
              }}
            >
              5
            </Text>
          </View>
          <Text
            style={{
              fontSize: tokens.fontSize.h1,
              fontWeight: tokens.fontWeight.bold,
              color: tokens.color.neutral900,
              marginBottom: 4,
            }}
          >
            {t('auth.welcomeBack')}
          </Text>
          <Text style={{ fontSize: tokens.fontSize.bodyMd, color: tokens.color.neutral600 }}>
            {t('auth.loginToContinue')}
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: tokens.space[4] }}>
          <Input
            label={t('auth.email')}
            required
            variant="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            onBlur={() => email && !EMAIL_RX.test(email.trim()) && setEmailErr(t('validation.emailInvalid'))}
            error={emailErr ?? undefined}
            accessibilityHint="Nhập email đã đăng ký"
            textContentType="emailAddress"
            autoComplete="email"
          />
          <Input
            label={t('auth.password')}
            required
            variant="password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            onBlur={() => password && password.length < 8 && setPwdErr(t('validation.passwordTooShort'))}
            error={pwdErr ?? undefined}
            textContentType="password"
            autoComplete="current-password"
          />

          <View style={{ alignItems: 'flex-end' }}>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => router.push('/forgot-password')}
            >
              {t('auth.forgotPassword')}
            </Button>
          </View>

          {lockSeconds && (
            <Banner
              variant="warning"
              message={t('auth.accountLocked', { minutes: Math.ceil(lockSeconds / 60) })}
            />
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!formValid}
            loading={submitting}
            onPress={submit}
            accessibilityLabel={t('auth.login')}
          >
            {submitting ? t('auth.loggingIn') : t('auth.login')}
          </Button>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: tokens.space[3],
              marginVertical: tokens.space[3],
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: tokens.color.neutral200 }} />
            <Text style={{ color: tokens.color.neutral500, fontSize: tokens.fontSize.labelSm }}>
              hoặc
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: tokens.color.neutral200 }} />
          </View>

          <Button
            variant="outline"
            size="lg"
            fullWidth
            disabled={submitting || !online}
            leftIcon={<Text style={{ fontSize: 18 }}>G</Text>}
            onPress={handleGoogle}
          >
            {t('auth.loginWithGoogle')}
          </Button>
          {Platform.OS === 'ios' && (
            <Button
              variant="outline"
              size="lg"
              fullWidth
              disabled={submitting || !online}
              leftIcon={<Text style={{ fontSize: 18 }}></Text>}
              onPress={handleApple}
            >
              {t('auth.loginWithApple')}
            </Button>
          )}
        </View>

        {/* Bottom link */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: tokens.space[6],
            gap: tokens.space[1],
          }}
        >
          <Text style={{ color: tokens.color.neutral600, fontSize: tokens.fontSize.bodyMd }}>
            {t('auth.noAccount')}
          </Text>
          <Button variant="ghost" size="md" onPress={() => router.push('/register')}>
            {t('auth.registerNow')}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
