/**
 * apps/mobile/app/profile/edit.tsx — S-PROFILE-02 Edit Profile
 *
 * Business Rules:
 *  - BR-AUTH-11: email read-only
 *  - BR-AUTH-10: phone validation
 *  - BR-AUTH-09: avatar upload constraints (handled in S-PROFILE-03)
 *
 * Test Cases:
 *  - TC-AUTH-14: edit profile happy path PUT /users/{id}
 *  - TC-AUTH-15: IDOR — server enforced; mobile sends only own userId
 *
 * Form pattern: reuses S-CHECKOUT-02 (FormLayout + FormSection + Input).
 */

import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { FormLayout, FormSection } from '../../src/components/FormLayout';
import { useToast } from '../../src/components/Toast';
import { tokens } from '../../src/theme/tokens';
import { user as sdkUser } from '../../src/sdk/services/user';
import { useAuthStore } from '../../src/stores/useAuthStore';

// ---------------------------------------------------------------------------
// Schema (zod) — BR-AUTH-10/11
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  fullName: z.string().min(2, 'fullName.min').max(100, 'fullName.max'),
  phone: z
    .string()
    .regex(/^(\+?84|0)\d{9,10}$/, 'phone.invalid')
    .or(z.literal('')),
  dob: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  nationality: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  bloodGroup: z.string().max(5).optional(),
  medicalInfo: z.string().max(1000).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

function zodResolver(schema: typeof profileSchema) {
  return async (values: ProfileFormValues) => {
    const parsed = schema.safeParse(values);
    if (parsed.success) return { values: parsed.data, errors: {} };
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of parsed.error.issues) {
      errors[String(issue.path[0])] = { type: 'validation', message: issue.message };
    }
    return { values: {}, errors };
  };
}

// Normalize backend gender variants to RHF schema (lowercase only)
function normalizeGender(
  g: string | undefined,
): 'male' | 'female' | 'other' | undefined {
  if (!g) return undefined;
  const lower = g.toLowerCase();
  if (lower === 'male' || lower === 'female' || lower === 'other') return lower;
  if (lower === 'unknown') return 'other';
  return undefined;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const user = useAuthStore((s) => s.user);

  const {
    control,
    handleSubmit,
    formState: { isDirty, isValid },
  } = useForm<ProfileFormValues>({
    mode: 'onBlur',
    defaultValues: {
      fullName: user?.fullName ?? '',
      phone: user?.phone ?? '',
      dob: user?.dob ?? '',
      gender: normalizeGender(user?.gender),
      nationality: user?.nationality ?? '',
      address: user?.address ?? '',
      bloodGroup: user?.bloodGroup ?? '',
      medicalInfo: user?.medicalInfo ?? '',
    },
    resolver: zodResolver(profileSchema) as any,
  });

  const onClose = () => {
    if (isDirty) {
      Alert.alert(t('common.discardTitle'), t('common.discardMsg'), [
        { text: t('common.no'), style: 'cancel' },
        { text: t('common.yes'), style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!user?.id) {
      toast.show({ variant: 'error', message: t('errors.generic') });
      return;
    }
    setSubmitting(true);
    try {
      const updated = await sdkUser.updateUserInfo(user.id, {
        fullName: values.fullName,
        phone: values.phone || undefined,
        dob: values.dob || undefined,
        gender: values.gender,
        nationality: values.nationality || undefined,
        address: values.address || undefined,
        bloodGroup: values.bloodGroup || undefined,
        medicalInfo: values.medicalInfo || undefined,
      });
      useAuthStore.getState().updateUser(updated);
      toast.show({ variant: 'success', message: t('profile.saveSuccess') });
      router.back();
    } catch (err) {
      toast.show({ variant: 'error', message: t('errors.generic') });
    } finally {
      setSubmitting(false);
    }
  });

  const saveEnabled = isDirty && isValid && !submitting;

  const initials = user
    ? user.fullName
        .split(' ')
        .map((s) => s[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : '';

  return (
    <>
      <Header
        title={t('profile.editTitle')}
        leading="close"
        onLeadingPress={onClose}
        actions={[
          {
            icon: saveEnabled ? '✓' : ' ',
            label: t('common.save'),
            onPress: saveEnabled ? onSubmit : () => {},
          },
        ]}
      />
      <FormLayout
        stickyBottom={
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!saveEnabled}
            loading={submitting}
            onPress={onSubmit}
            accessibilityLabel={t('common.save')}
          >
            {t('profile.saveChanges')}
          </Button>
        }
      >
        {/* Avatar row -> S-PROFILE-03 */}
        <Pressable
          onPress={() => router.push('/profile/change-avatar')}
          style={{
            alignItems: 'center',
            paddingVertical: tokens.space[4],
            gap: tokens.space[2],
          }}
          accessibilityRole="button"
          accessibilityLabel={t('profile.changeAvatar')}
        >
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
          >
            <Text style={{ fontSize: 32, color: tokens.color.brandPrimary }}>
              {initials || 'NA'}
            </Text>
          </View>
          <Text style={{ color: tokens.color.brandPrimary, fontWeight: tokens.fontWeight.semibold }}>
            <Ionicons name="pencil-outline" size={14} color={tokens.color.brandPrimary} />{' '}
            {t('profile.changeAvatar')}
          </Text>
        </Pressable>

        <FormSection title={t('profile.emailSection')}>
          <Input
            label={t('profile.emailReadOnly')}
            value={user?.email ?? ''}
            readOnly
          />
        </FormSection>

        <FormSection title={t('checkout.personalInfo')}>
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => (
              <Input
                label={t('profile.fullName')}
                required
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={error?.message ? t(`profile.errors.${error.message}`) : undefined}
              />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value, onBlur }, fieldState: { error } }) => (
              <Input
                label={t('auth.phone')}
                variant="phone"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={error?.message ? t(`profile.errors.${error.message}`) : undefined}
              />
            )}
          />
          <Controller
            control={control}
            name="dob"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t('profile.dob')}
                value={value}
                onChangeText={onChange}
                placeholder="YYYY-MM-DD"
                // TODO: replace with native DateTimePicker
              />
            )}
          />
          <Controller
            control={control}
            name="gender"
            render={({ field: { onChange, value } }) => (
              <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
                {(['male', 'female', 'other'] as const).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => onChange(g)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: value === g }}
                    style={{
                      paddingVertical: tokens.space[2],
                      paddingHorizontal: tokens.space[3],
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor:
                        value === g ? tokens.color.brandPrimary : tokens.color.neutral300,
                      backgroundColor:
                        value === g ? tokens.color.brandPrimaryLight : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: value === g ? tokens.color.brandPrimary : tokens.color.neutral700,
                      }}
                    >
                      {t(`profile.gender.${g}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          />
        </FormSection>

        <FormSection title={t('profile.contactSection')}>
          <Controller
            control={control}
            name="nationality"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t('profile.nationality')}
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t('profile.address')}
                value={value}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
              />
            )}
          />
        </FormSection>

        <FormSection title={t('profile.medicalSection')}>
          <Controller
            control={control}
            name="bloodGroup"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t('profile.bloodType')}
                value={value}
                onChangeText={onChange}
                placeholder="A+/B+/O-"
              />
            )}
          />
          <Controller
            control={control}
            name="medicalInfo"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t('profile.medicalNote')}
                value={value}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
              />
            )}
          />
        </FormSection>
      </FormLayout>
    </>
  );
}
