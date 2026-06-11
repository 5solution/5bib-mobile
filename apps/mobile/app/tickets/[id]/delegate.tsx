/**
 * apps/mobile/app/tickets/[id]/delegate.tsx — Uỷ quyền nhận racekit
 *
 * Web parity: tickets/[id]/components/delegator-modal.tsx — a dedicated
 * 4-field form (delegator_name/email/phone/cccd) prefilled from
 * `athlete_sub_info`, saved through the SAME simple-edit endpoint as athlete
 * info (PUT /athlete/simple-edit?athlete_id=X) with ONLY delegator fields in
 * the payload. Available for CHECKED_IN tickets (web: DelegatorButton).
 *
 * Previously the Uỷ quyền tile routed to the athlete edit screen — wrong
 * feature entirely (Danny 2026-06-11: "Ấn Uỷ quyền thì lại ra sửa thông tin").
 */

import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Header } from '../../../src/components/Header';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { Banner } from '../../../src/components/ErrorState';
import { Skeleton } from '../../../src/components/Skeleton';
import { FormLayout, FormSection } from '../../../src/components/FormLayout';
import { useToast } from '../../../src/components/Toast';
import { tokens } from '../../../src/theme/tokens';
import { athlete as athleteSdk } from '../../../src/sdk/services/athlete';
import { FetcherError } from '../../../src/sdk/core';
import type { Athlete } from '../../../src/sdk/models';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function DelegateRacekitScreen() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cccd, setCccd] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const a = await athleteSdk.getAthleteByTicketCode(String(id));
        if (cancelled) return;
        if (!a) {
          setLoadError(true);
          return;
        }
        setAthlete(a);
        setName(a.delegatorName ?? '');
        setEmail(a.delegatorEmail ?? '');
        setPhone(a.delegatorPhone ?? '');
        setCccd(a.delegatorCccd ?? '');
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const isEdit = !!athlete?.delegatorName;
  const invalid =
    !name.trim() ||
    !phone.trim() ||
    !cccd.trim() ||
    (!!email.trim() && !EMAIL_RX.test(email.trim()));

  const save = async () => {
    if (!athlete) return;
    if (invalid) {
      toast.show({ variant: 'error', message: t('errors.formInvalid') });
      return;
    }
    setSaving(true);
    try {
      // Web parity: only the delegator_* keys in the simple-edit payload.
      await athleteSdk.simpleEdit({
        athleteId: athlete.id,
        payload: {
          delegator_name: name.trim(),
          delegator_email: email.trim(),
          delegator_phone: phone.trim(),
          delegator_cccd: cccd.trim(),
        },
      });
      toast.show({ variant: 'success', message: t('tickets.delegate.saved') });
      router.back();
    } catch (e) {
      // Surface the backend message when present (same pattern as edit.tsx).
      let msg: string | undefined;
      if (e instanceof FetcherError) {
        const r = e.response as Record<string, unknown> | undefined;
        const errObj = (r?.error ?? r) as Record<string, unknown> | undefined;
        if (typeof errObj?.message === 'string') msg = errObj.message;
      }
      toast.show({
        variant: 'error',
        message: (msg ?? t('errors.generic')).slice(0, 140),
      });
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit
    ? t('tickets.delegate.editTitle')
    : t('tickets.delegate.addTitle');

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header
        title={title}
        leading="back"
        onLeadingPress={() => router.back()}
      />
      {loadError && <Banner variant="error" message={t('errors.generic')} />}
      {loading ? (
        <View style={{ gap: tokens.space[3], padding: tokens.space[4] }}>
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </View>
      ) : athlete ? (
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
            {t('tickets.delegate.desc')}
          </Text>
          <FormSection title={t('tickets.delegate.sectionTitle')}>
            <View style={{ gap: tokens.space[3] }}>
              <Input
                label={t('tickets.delegate.name')}
                required
                value={name}
                onChangeText={setName}
              />
              <Input
                label={t('tickets.delegate.email')}
                variant="email"
                value={email}
                onChangeText={setEmail}
              />
              <Input
                label={t('tickets.delegate.phone')}
                required
                variant="phone"
                value={phone}
                onChangeText={setPhone}
              />
              <Input
                label={t('tickets.delegate.cccd')}
                required
                value={cccd}
                onChangeText={setCccd}
              />
            </View>
          </FormSection>
        </FormLayout>
      ) : null}
    </View>
  );
}
