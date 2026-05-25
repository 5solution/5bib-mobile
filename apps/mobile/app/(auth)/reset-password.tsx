/**
 * apps/mobile/app/(auth)/reset-password.tsx — S-AUTH-05
 *
 * BR-AUTH-07 (OTP 6 digit, expire 5 min, resend 60s cooldown)
 * BR-AUTH-16 (newPasswordConfirm must equal newPassword — client side block)
 */

import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { OTPInput } from '../../src/components/OTPInput';
import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { FormLayout, FormSection, SectionDivider } from '../../src/components/FormLayout';
import { useToast } from '../../src/components/Toast';
import { useCountdown, passwordStrength, useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';

const HAS_DIGIT_LETTER = /^(?=.*[a-zA-Z])(?=.*[0-9]).{8,}$/;

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [otp, setOtp] = useState('');
  const [otpErr, setOtpErr] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [confirmErr, setConfirmErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cd = useCountdown(60, true);

  const strength = passwordStrength(newPwd);
  const strengthLabel =
    strength < 30
      ? t('auth.passwordStrength.weak')
      : strength < 60
      ? t('auth.passwordStrength.medium')
      : t('auth.passwordStrength.strong');

  const valid =
    otp.length === 6 &&
    HAS_DIGIT_LETTER.test(newPwd) &&
    confirmPwd === newPwd &&
    online;

  const submit = async () => {
    if (otp.length !== 6) {
      setOtpErr(t('validation.otpInvalid'));
      return;
    }
    if (!HAS_DIGIT_LETTER.test(newPwd)) {
      setPwdErr(t('validation.passwordNeedDigitLetter'));
      return;
    }
    if (confirmPwd !== newPwd) {
      setConfirmErr(t('validation.passwordMismatch'));
      return;
    }
    setSubmitting(true);
    try {
      // await sdk.user.reset({ otp, email, newPassword: newPwd, newPasswordConfirm: confirmPwd });
      await new Promise((r) => setTimeout(r, 800));
      toast.show({ variant: 'success', message: t('common.save') });
      router.replace({ pathname: '/(auth)/login', params: { email } });
    } catch (e: any) {
      if (e?.status === 400) {
        setOtpErr(t('validation.otpWrong'));
        setOtp('');
      } else if (e?.status === 410) {
        setOtpErr(t('validation.otpExpired'));
      } else {
        toast.show({ variant: 'error', message: t('errors.generic') });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (cd.running) return;
    // await sdk.user.forgot({ email });
    cd.restart(60);
    setOtp('');
    setOtpErr(null);
    toast.show({ variant: 'success', message: t('auth.otpSentTo', { email }) });
  };

  return (
    <>
      <Header title={t('auth.resetTitle')} leading="back" onLeadingPress={() => router.back()} />
      {!online && <Banner variant="warning" message={t('errors.network')} />}
      <FormLayout
        stickyBottom={
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!valid}
            loading={submitting}
            onPress={submit}
          >
            {submitting ? t('auth.resetting') : t('auth.resetPassword')}
          </Button>
        }
      >
        <FormSection
          title={t('auth.otpLabel')}
          description={t('auth.otpSentTo', { email: email ?? '' })}
        >
          <OTPInput value={otp} onChange={setOtp} error={!!otpErr} />
          {otpErr && (
            <Text style={{ color: tokens.color.error, fontSize: tokens.fontSize.bodySm, textAlign: 'center' }}>
              {otpErr}
            </Text>
          )}
          <View style={{ alignItems: 'center' }}>
            {cd.seconds > 0 ? (
              <Text style={{ color: tokens.color.neutral500, fontSize: tokens.fontSize.bodySm }}>
                {t('auth.resendIn', { seconds: cd.seconds })}
              </Text>
            ) : (
              <Button variant="ghost" size="sm" onPress={resend}>
                {t('auth.resendNow')}
              </Button>
            )}
          </View>
        </FormSection>

        <SectionDivider />

        <FormSection>
          <Input
            label={t('auth.newPassword')}
            required
            variant="password"
            value={newPwd}
            onChangeText={setNewPwd}
            error={pwdErr ?? undefined}
            textContentType="newPassword"
          />
          {newPwd.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor:
                      strength > i * 25
                        ? strength < 30
                          ? tokens.color.error
                          : strength < 60
                          ? tokens.color.warning
                          : tokens.color.success
                        : tokens.color.neutral200,
                  }}
                />
              ))}
              <Text style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral600 }}>
                {strengthLabel}
              </Text>
            </View>
          )}
          <Input
            label={t('auth.confirmNewPassword')}
            required
            variant="password"
            value={confirmPwd}
            onChangeText={setConfirmPwd}
            error={confirmErr ?? undefined}
          />
        </FormSection>
      </FormLayout>
    </>
  );
}
