/**
 * apps/mobile/app/profile/change-password.tsx — F20 Đổi mật khẩu
 *
 * Authenticated password change. SDK `user.changePassword` →
 * POST /users/update-password with camelCase body
 * { password, newPassword, confirmNewPassword } (all required; verified live
 * DTO 2026-06-11). Backend checks the CURRENT password first and answers
 * "Username or password is incorrect!" (code 440852160) on mismatch —
 * mapped to a VN message. new === confirm MUST be validated client-side:
 * the backend's current-password check shadows its confirm-mismatch check.
 *
 * Validation matches the app's own register/reset screens
 * (HAS_DIGIT_LETTER: min 8 chars with letters + digits) — web's reset flow
 * is stricter but mobile stays self-consistent.
 */

import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { FormLayout, FormSection } from '../../src/components/FormLayout';
import { useToast } from '../../src/components/Toast';
import { tokens } from '../../src/theme/tokens';
import { user as sdkUser } from '../../src/sdk/services/user';
import { FetcherError } from '../../src/sdk/core';

// Backend DTO caps at 20 ("Password length must be between 8 and 20
// characters." — probed live 2026-06-11); mirror it client-side so the
// user gets an inline VN error instead of a raw English toast.
const HAS_DIGIT_LETTER = /^(?=.*[a-zA-Z])(?=.*[0-9]).{8,20}$/;

export default function ChangePasswordScreen() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  // Synchronous re-entry lock — React state is async, so a same-tick double
  // tap reads stale `saving` and fires the POST twice (same trap checkout's
  // submitLock guards against, verified live there 2026-05-28).
  const submitLock = useRef(false);

  // Deep-linked entry has no parent stack — bare router.back() is a no-op
  // and strands the user (the F29 change-avatar bug, same class).
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  };

  const currentError =
    touched && !current ? t('validation.required') : undefined;
  const nextError =
    touched && next && !HAS_DIGIT_LETTER.test(next)
      ? t('validation.passwordRule8to20')
      : touched && next && next === current
        ? t('validation.passwordSameAsOld')
        : touched && !next
          ? t('validation.required')
          : undefined;
  const confirmError =
    touched && confirm !== next
      ? t('validation.passwordMismatch')
      : touched && !confirm
        ? t('validation.required')
        : undefined;

  const invalid =
    !current ||
    !next ||
    !confirm ||
    !HAS_DIGIT_LETTER.test(next) ||
    next === current ||
    confirm !== next;

  const save = async () => {
    if (submitLock.current) return;
    setTouched(true);
    if (invalid) {
      toast.show({ variant: 'error', message: t('errors.formInvalid') });
      return;
    }
    submitLock.current = true;
    setSaving(true);
    try {
      await sdkUser.changePassword({
        currentPassword: current,
        newPassword: next,
        confirmNewPassword: confirm,
      });
      toast.show({
        variant: 'success',
        message: t('profile.changePassword.success'),
      });
      goBack();
    } catch (e) {
      let msg: string | undefined;
      if (e instanceof FetcherError) {
        const r = e.response as Record<string, unknown> | undefined;
        const errObj = (r?.error ?? r) as Record<string, unknown> | undefined;
        if (typeof errObj?.message === 'string') {
          // Known BE answer for a wrong current password — translate it.
          msg = /username or password is incorrect/i.test(errObj.message)
            ? t('profile.changePassword.wrongCurrent')
            : errObj.message;
        } else if (errObj) {
          // DTO validation errors come as a field-keyed map
          // ({newPassword: "Password length must be…"}), no `message` key —
          // surface the first field message instead of the generic toast.
          const firstField = Object.values(errObj).find(
            (v): v is string => typeof v === 'string',
          );
          if (firstField) msg = firstField;
        }
      }
      toast.show({
        variant: 'error',
        message: (msg ?? t('errors.generic')).slice(0, 140),
      });
    } finally {
      setSaving(false);
      submitLock.current = false;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header
        title={t('profile.changePassword.title')}
        leading="back"
        onLeadingPress={goBack}
      />
      <FormLayout
        stickyBottom={
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={saving}
            onPress={save}
          >
            {t('common.save')}
          </Button>
        }
      >
        <Text
          style={{
            fontSize: tokens.fontSize.bodySm,
            color: tokens.color.neutral600,
          }}
        >
          {t('profile.changePassword.desc')}
        </Text>
        <FormSection title={t('profile.changePassword.title')}>
          <View style={{ gap: tokens.space[3] }}>
            <Input
              label={t('profile.changePassword.current')}
              required
              variant="password"
              value={current}
              onChangeText={setCurrent}
              error={currentError}
              textContentType="password"
            />
            <Input
              label={t('auth.newPassword')}
              required
              variant="password"
              value={next}
              onChangeText={setNext}
              error={nextError}
              helper={t('validation.passwordRule8to20')}
              textContentType="newPassword"
            />
            <Input
              label={t('auth.confirmNewPassword')}
              required
              variant="password"
              value={confirm}
              onChangeText={setConfirm}
              error={confirmError}
              textContentType="newPassword"
            />
          </View>
        </FormSection>
      </FormLayout>
    </View>
  );
}
