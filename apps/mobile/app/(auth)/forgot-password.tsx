/**
 * apps/mobile/app/(auth)/forgot-password.tsx — S-AUTH-04
 */

import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { FormLayout } from '../../src/components/FormLayout';
import { useToast } from '../../src/components/Toast';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import { user as sdkUser } from '../../src/sdk/services/user';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();

  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const valid = EMAIL_RX.test(email.trim());

  const submit = async () => {
    if (!valid) {
      setErr(t('validation.emailInvalid'));
      return;
    }
    setSubmitting(true);
    try {
      await sdkUser.forgot({ email: email.trim() });
      toast.show({
        variant: 'success',
        message: t('auth.otpSentTo', { email: email.trim() }),
      });
      router.push({ pathname: '/reset-password', params: { email: email.trim() } });
    } catch (e: any) {
      if (e?.status === 429) {
        toast.show({ variant: 'warning', message: t('errors.generic') });
      } else {
        toast.show({ variant: 'error', message: t('errors.generic') });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header title={t('auth.forgotPassword')} leading="back" onLeadingPress={() => router.back()} />
      {!online && <Banner variant="warning" message={t('errors.network')} />}
      <FormLayout
        stickyBottom={
          <View style={{ gap: tokens.space[2] }}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!valid || !online}
              loading={submitting}
              onPress={submit}
            >
              {submitting ? t('auth.sendingOtp') : t('auth.sendOtp')}
            </Button>
            <Button variant="ghost" size="md" fullWidth onPress={() => router.back()}>
              {t('auth.backToLogin')}
            </Button>
          </View>
        }
      >
        <View style={{ alignItems: 'center', marginVertical: tokens.space[4] }}>
          <Text style={{ fontSize: 64 }}>📧</Text>
        </View>
        <Text
          style={{
            fontSize: tokens.fontSize.h2,
            fontWeight: tokens.fontWeight.bold,
            color: tokens.color.neutral900,
            textAlign: 'center',
          }}
        >
          {t('auth.forgotTitle')}
        </Text>
        <Text
          style={{
            fontSize: tokens.fontSize.bodyMd,
            color: tokens.color.neutral600,
            textAlign: 'center',
            lineHeight: tokens.lineHeight.bodyMd,
          }}
        >
          {t('auth.forgotSubtitle')}
        </Text>

        <Input
          label={t('auth.email')}
          required
          variant="email"
          value={email}
          onChangeText={setEmail}
          onBlur={() => email && !valid && setErr(t('validation.emailInvalid'))}
          error={err ?? undefined}
          placeholder={t('auth.emailPlaceholder')}
          textContentType="emailAddress"
        />
      </FormLayout>
    </>
  );
}
