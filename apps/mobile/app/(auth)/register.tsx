/**
 * apps/mobile/app/(auth)/register.tsx — S-AUTH-03
 *
 * BR-AUTH-02 (password rule), BR-AUTH-17 (confirmPassword), BR-AUTH-18 (agreeTerms gate).
 * agreeTerms is FRONTEND-ONLY — NEVER sent to backend.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { useToast } from '../../src/components/Toast';
import { useOnline, passwordStrength } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HAS_DIGIT_LETTER = /^(?=.*[a-zA-Z])(?=.*[0-9]).{8,}$/;

interface Form {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const online = useOnline();

  const [form, setForm] = useState<Form>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const [err, setErr] = useState<Partial<Record<keyof Form, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((p) => ({ ...p, [k]: v }));

  const strength = passwordStrength(form.password);
  const strengthLabel =
    strength < 30
      ? t('auth.passwordStrength.weak')
      : strength < 60
      ? t('auth.passwordStrength.medium')
      : t('auth.passwordStrength.strong');
  const strengthColor =
    strength < 30 ? tokens.color.error : strength < 60 ? tokens.color.warning : tokens.color.success;

  const isFormValid =
    form.fullName.trim().length >= 2 &&
    EMAIL_RX.test(form.email.trim()) &&
    HAS_DIGIT_LETTER.test(form.password) &&
    form.confirmPassword === form.password &&
    form.agreeTerms &&
    online;

  const validate = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (form.fullName.trim().length < 2) e.fullName = t('validation.fullNameTooShort');
    if (!EMAIL_RX.test(form.email.trim())) e.email = t('validation.emailInvalid');
    if (!HAS_DIGIT_LETTER.test(form.password)) e.password = t('validation.passwordNeedDigitLetter');
    if (form.confirmPassword !== form.password) e.confirmPassword = t('validation.passwordMismatch');
    if (!form.agreeTerms) e.agreeTerms = t('validation.agreeTermsRequired');
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      // BR-AUTH-18: do NOT send agreeTerms to backend
      // await sdk.user.register({
      //   fullName: form.fullName.trim(),
      //   email: form.email.trim(),
      //   password: form.password,
      //   confirmPassword: form.confirmPassword,
      // });
      await new Promise((r) => setTimeout(r, 1000));
      toast.show({ variant: 'success', message: t('auth.registerSuccess') });
      router.replace('/(tabs)/home');
    } catch (e: any) {
      if (e?.status === 409) {
        toast.show({ variant: 'error', message: t('auth.emailExists') });
      } else {
        toast.show({ variant: 'error', message: t('errors.generic') });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}
    >
      <Header title={t('auth.register')} leading="back" onLeadingPress={() => router.back()} />
      {!online && <Banner variant="warning" message={t('errors.network')} />}
      <ScrollView
        contentContainerStyle={{
          padding: tokens.space[4],
          paddingBottom: insets.bottom + tokens.space[6],
          gap: tokens.space[4],
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text
            style={{
              fontSize: tokens.fontSize.h2,
              fontWeight: tokens.fontWeight.bold,
              color: tokens.color.neutral900,
            }}
          >
            {t('auth.registerTitle')}
          </Text>
          <Text
            style={{
              fontSize: tokens.fontSize.bodyMd,
              color: tokens.color.neutral600,
              marginTop: 4,
            }}
          >
            {t('auth.registerSubtitle')}
          </Text>
        </View>

        <Input
          label={t('auth.fullName')}
          required
          value={form.fullName}
          onChangeText={(v) => set('fullName', v)}
          error={err.fullName}
          placeholder="Nguyễn Văn A"
          textContentType="name"
        />
        <Input
          label={t('auth.email')}
          required
          variant="email"
          value={form.email}
          onChangeText={(v) => set('email', v)}
          error={err.email}
          placeholder={t('auth.emailPlaceholder')}
          textContentType="emailAddress"
        />
        <Input
          label={t('auth.password')}
          required
          variant="password"
          value={form.password}
          onChangeText={(v) => set('password', v)}
          error={err.password}
          textContentType="newPassword"
          autoComplete="password-new"
        />
        {form.password.length > 0 && (
          <View style={{ marginTop: -tokens.space[2], gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor:
                      strength > i * 25 ? strengthColor : tokens.color.neutral200,
                  }}
                />
              ))}
            </View>
            <Text style={{ fontSize: tokens.fontSize.bodySm, color: strengthColor }}>
              {strengthLabel}
            </Text>
          </View>
        )}
        <Input
          label={t('auth.confirmPassword')}
          required
          variant="password"
          value={form.confirmPassword}
          onChangeText={(v) => set('confirmPassword', v)}
          error={err.confirmPassword}
        />

        {/* Terms checkbox */}
        <Pressable
          onPress={() => set('agreeTerms', !form.agreeTerms)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: form.agreeTerms }}
          accessibilityLabel={t('auth.agreeTermsPrefix') + ' ' + t('auth.termsLink')}
          style={{ flexDirection: 'row', gap: tokens.space[2], alignItems: 'flex-start', minHeight: 44 }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: form.agreeTerms ? tokens.color.brandPrimary : tokens.color.neutral300,
              backgroundColor: form.agreeTerms ? tokens.color.brandPrimary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 2,
            }}
          >
            {form.agreeTerms && (
              <Text style={{ color: tokens.color.neutral0, fontSize: 12 }}>✓</Text>
            )}
          </View>
          <Text
            style={{
              flex: 1,
              fontSize: tokens.fontSize.bodyMd,
              color: tokens.color.neutral700,
              lineHeight: tokens.lineHeight.bodyMd,
            }}
          >
            {t('auth.agreeTermsPrefix')}{' '}
            <Text style={{ color: tokens.color.brandPrimary, fontWeight: tokens.fontWeight.semibold }}>
              {t('auth.termsLink')}
            </Text>{' '}
            {t('auth.and')}{' '}
            <Text style={{ color: tokens.color.brandPrimary, fontWeight: tokens.fontWeight.semibold }}>
              {t('auth.privacyLink')}
            </Text>
          </Text>
        </Pressable>
        {err.agreeTerms && (
          <Text style={{ color: tokens.color.error, fontSize: tokens.fontSize.bodySm }}>
            {err.agreeTerms}
          </Text>
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!isFormValid}
          loading={submitting}
          onPress={submit}
        >
          {submitting ? t('auth.registering') : t('auth.register')}
        </Button>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: tokens.space[1],
            marginTop: tokens.space[3],
          }}
        >
          <Text style={{ color: tokens.color.neutral600, fontSize: tokens.fontSize.bodyMd }}>
            {t('auth.haveAccount')}
          </Text>
          <Button variant="ghost" size="md" onPress={() => router.replace('/(auth)/login')}>
            {t('auth.loginLink')}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
