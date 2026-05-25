/**
 * apps/mobile/app/tickets/[id]/edit.tsx — S-TICKETS-03 (simplified)
 *
 * Real spec: reuse S-CHECKOUT-02 form. This file shows the key delta:
 *   - Header has "Save" trailing
 *   - email + ID are read-only (BR-AUTH-11)
 *   - No mode toggle, no guardian (already set at purchase)
 */

import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Header } from '../../../src/components/Header';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { FormLayout, FormSection } from '../../../src/components/FormLayout';
import { useToast } from '../../../src/components/Toast';
import { tokens } from '../../../src/theme/tokens';

export default function EditTicketScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [form, setForm] = useState({
    firstName: 'Nguyễn',
    lastName: 'Văn A',
    phone: '0912345678',
    tshirtSize: 'M',
    racekit: 'Tiêu chuẩn',
    nameOnBib: 'NGUYEN VAN A',
    emergencyContactName: 'Nguyễn Thị B',
    emergencyContactPhone: '0987654321',
  });
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };

  const save = async () => {
    setSubmitting(true);
    try {
      // await sdk.athlete.simpleEdit({ athleteId, ...form });
      await new Promise((r) => setTimeout(r, 700));
      toast.show({ variant: 'success', message: t('profile.saveSuccess') });
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header
        title={t('tickets.editAthlete')}
        leading="close"
        onLeadingPress={() => router.back()}
        actions={[
          {
            icon: dirty && !submitting ? '✓' : ' ',
            label: t('common.save'),
            onPress: dirty && !submitting ? save : () => {},
          },
        ]}
      />
      <FormLayout
        stickyBottom={
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!dirty || submitting}
            loading={submitting}
            onPress={save}
          >
            {t('profile.saveChanges')}
          </Button>
        }
      >
        <FormSection title="Email & giấy tờ">
          <Input label={t('profile.emailReadOnly')} value="a@example.com" readOnly />
          <Input label={t('checkout.idNumber')} value="012345678" readOnly />
        </FormSection>

        <FormSection title={t('checkout.personalInfo')}>
          <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('checkout.firstName')}
                required
                value={form.firstName}
                onChangeText={(v) => set('firstName', v)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={t('checkout.lastName')}
                required
                value={form.lastName}
                onChangeText={(v) => set('lastName', v)}
              />
            </View>
          </View>
          <Input
            label={t('auth.phone')}
            required
            variant="phone"
            value={form.phone}
            onChangeText={(v) => set('phone', v)}
          />
        </FormSection>

        <FormSection title="Trang phục">
          <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
            <View style={{ flex: 1 }}>
              <Input
                label={t('checkout.tshirtSize')}
                required
                value={form.tshirtSize}
                onChangeText={(v) => set('tshirtSize', v)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label={t('checkout.bibRacekit')}
                required
                value={form.racekit}
                onChangeText={(v) => set('racekit', v)}
              />
            </View>
          </View>
          <Input
            label={t('checkout.nameOnBib')}
            required
            maxLength={15}
            charCounter
            value={form.nameOnBib}
            onChangeText={(v) => set('nameOnBib', v.toUpperCase())}
          />
        </FormSection>

        <FormSection title={t('checkout.emergencyContact')}>
          <Input
            label={t('checkout.emergencyName')}
            required
            value={form.emergencyContactName}
            onChangeText={(v) => set('emergencyContactName', v)}
          />
          <Input
            label={t('checkout.emergencyPhone')}
            required
            variant="phone"
            value={form.emergencyContactPhone}
            onChangeText={(v) => set('emergencyContactPhone', v)}
          />
        </FormSection>
      </FormLayout>
    </>
  );
}
