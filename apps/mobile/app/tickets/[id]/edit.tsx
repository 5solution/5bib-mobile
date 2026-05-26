/**
 * apps/mobile/app/tickets/[id]/edit.tsx — S-TICKETS-03 Register / Edit Athlete
 *
 * Two modes (decided at runtime by athlete presence on ticket):
 *   - Register   : ticket has no athlete bound → POST /athlete/register?code_value=X
 *                  (full 25-field schema, claim ticket)
 *   - Edit       : athlete present → PUT  /athlete/simple-edit?athlete_id=X
 *                  (partial update; payload snake_case body)
 *
 * Profile picker: loads saved personas via sdk.profile.findMyProfiles() and
 * lets the user pre-fill the form from one of them (first-time register only).
 *
 * SDK calls:
 *   - sdk.ticket.getTicketById      (load context)
 *   - sdk.athlete.getAthleteByTicketCode (detect mode + prefill)
 *   - sdk.profile.findMyProfiles    (profile picker)
 *   - sdk.athlete.registerAthlete   (register mode)
 *   - sdk.athlete.simpleEdit        (edit mode — probe live; backend may also
 *                                    expose `/athlete/update/{id}` — we use
 *                                    simple-edit per API_REFERENCE canonical)
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Header } from '../../../src/components/Header';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { Banner } from '../../../src/components/ErrorState';
import { Skeleton } from '../../../src/components/Skeleton';
import { FormLayout, FormSection } from '../../../src/components/FormLayout';
import { BottomSheet } from '../../../src/components/BottomSheet';
import { useToast } from '../../../src/components/Toast';
import { tokens } from '../../../src/theme/tokens';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { ticket as ticketSdk } from '../../../src/sdk/services/ticket';
import { athlete as athleteSdk } from '../../../src/sdk/services/athlete';
import { profile as profileSdk } from '../../../src/sdk/services/profile';
import { FetcherError } from '../../../src/sdk/core';
import type { Athlete, AthleteCreatePayload, Profile, Ticket } from '../../../src/sdk/models';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
  nationality: string;
  idNumber: string;
  tshirtSize: string;
  racekit: string;
  nameOnBib: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bloodType: string;
  medicalInformation: string;
  currentMedication: string;
  address: string;
  club: string;
}

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dob: '',
  gender: 'male',
  nationality: 'Vietnam',
  idNumber: '',
  tshirtSize: 'M',
  racekit: 'Tiêu chuẩn',
  nameOnBib: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  bloodType: '',
  medicalInformation: '',
  currentMedication: '',
  address: '',
  club: '',
};

function fromAthlete(a: Athlete | null, fallbackEmail: string): FormState {
  if (!a) return { ...EMPTY, email: fallbackEmail };
  return {
    firstName: a.firstName ?? '',
    lastName: a.lastName ?? '',
    email: a.email ?? fallbackEmail,
    phone: a.contactPhone ?? '',
    dob: a.dob ?? '',
    gender:
      a.gender === 'MALE'
        ? 'male'
        : a.gender === 'FEMALE'
          ? 'female'
          : 'other',
    nationality: a.nationality ?? 'Vietnam',
    idNumber: a.idNumber ?? '',
    tshirtSize: a.racekit ?? 'M',
    racekit: a.racekit ?? 'Tiêu chuẩn',
    nameOnBib: a.nameOnBib ?? '',
    // sosPhone packed as "phone-name" by SDK mapper.
    emergencyContactPhone: (a.sosPhone ?? '').split('-')[0] ?? '',
    emergencyContactName: (a.sosPhone ?? '').split('-').slice(1).join('-') ?? '',
    bloodType: '',
    medicalInformation: a.medicalInfo ?? '',
    currentMedication: a.currentMedication ?? '',
    address: '',
    club: a.club ?? '',
  };
}

function fromProfile(p: Profile, fallbackEmail: string): FormState {
  const detail = (typeof p.detail === 'object' ? p.detail : {}) as Record<string, unknown>;
  const get = (k: string) => (typeof detail[k] === 'string' ? (detail[k] as string) : '');
  const [first = '', ...rest] = (p.name ?? '').trim().split(/\s+/);
  return {
    ...EMPTY,
    firstName: first,
    lastName: rest.join(' '),
    email: p.email ?? fallbackEmail,
    phone: p.phoneNumber ?? '',
    dob: get('dob'),
    gender: (get('gender') as FormState['gender']) || 'male',
    nationality: get('nationality') || 'Vietnam',
    idNumber: get('idNumber') || get('id_number'),
    tshirtSize: get('tshirtSize') || get('tshirt_size') || 'M',
    racekit: get('racekit') || 'Tiêu chuẩn',
    nameOnBib: get('nameOnBib') || get('name_on_bib') || (first + ' ' + rest.join(' ')).toUpperCase(),
    emergencyContactName: get('emergencyContactName') || get('emergency_contact_name'),
    emergencyContactPhone: get('emergencyContactPhone') || get('emergency_contact_phone'),
    bloodType: get('bloodType') || get('blood_type'),
    medicalInformation: get('medicalInformation') || get('medical_info'),
    currentMedication: get('currentMedication') || get('current_medication'),
    address: get('address'),
    club: get('club'),
  };
}

function toCreatePayload(f: FormState): AthleteCreatePayload {
  return {
    firstName: f.firstName,
    lastName: f.lastName,
    email: f.email,
    phone: f.phone,
    dob: f.dob,
    gender: f.gender,
    nationality: f.nationality,
    idNumber: f.idNumber,
    tshirtSize: f.tshirtSize,
    racekit: f.racekit,
    nameOnBib: f.nameOnBib,
    emergencyContactName: f.emergencyContactName,
    emergencyContactPhone: f.emergencyContactPhone,
    bloodType: f.bloodType || undefined,
    medicalInformation: f.medicalInformation || undefined,
    currentMedication: f.currentMedication || undefined,
    address: f.address || undefined,
    club: f.club || undefined,
  };
}

/** Build the partial body used by simpleEdit — keys mirror backend snake_case. */
function toSimpleEditBody(f: FormState): Record<string, unknown> {
  return {
    first_name: f.firstName,
    last_name: f.lastName,
    name: `${f.firstName} ${f.lastName}`.trim(),
    contact_phone: f.phone,
    dob: f.dob,
    gender: f.gender.toUpperCase(),
    tshirt_size: f.tshirtSize,
    racekit: f.racekit,
    name_on_bib: f.nameOnBib,
    sos_phone: `${f.emergencyContactPhone}-${f.emergencyContactName}`,
    sosPhone: `${f.emergencyContactPhone}-${f.emergencyContactName}`,
    medical_info: f.medicalInformation,
    current_medication: f.currentMedication,
    blood_type: f.bloodType,
    club: f.club,
    address: f.address,
  };
}

export default function EditTicketScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const authUser = useAuthStore((s) => s.user);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [existingAthlete, setExistingAthlete] = useState<Athlete | null>(null);
  const [form, setForm] = useState<FormState>(() => ({ ...EMPTY, email: authUser?.email ?? '' }));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Profile picker state
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(false);

  const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setDirty(true);
  }, []);

  // Load ticket + existing athlete (decide mode).
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const tk = await ticketSdk.getTicketById(id);
        setTicket(tk);
        let a: Athlete | null = null;
        if (tk?.value) {
          try {
            a = await athleteSdk.getAthleteByTicketCode(tk.value);
          } catch {
            a = null;
          }
        }
        setExistingAthlete(a);
        setForm(fromAthlete(a, authUser?.email ?? ''));
      } catch (e) {
        if (e instanceof FetcherError && e.status === 401) return;
        toast.show({ variant: 'error', message: t('tickets.loadFailed') });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, authUser?.email, t, toast]);

  const openProfilePicker = useCallback(async () => {
    setProfilesOpen(true);
    if (profiles !== null) return;
    setProfilesLoading(true);
    try {
      const list = await profileSdk.findMyProfiles();
      setProfiles(list);
    } catch {
      setProfiles([]);
      toast.show({ variant: 'error', message: t('errors.generic') });
    } finally {
      setProfilesLoading(false);
    }
  }, [profiles, t, toast]);

  const applyProfile = useCallback(
    (p: Profile) => {
      setForm(fromProfile(p, authUser?.email ?? ''));
      setDirty(true);
      setProfilesOpen(false);
    },
    [authUser?.email],
  );

  const mode: 'register' | 'edit' = useMemo(
    () => (existingAthlete?.id ? 'edit' : 'register'),
    [existingAthlete],
  );

  const submit = useCallback(async () => {
    if (!ticket?.value) return;
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await athleteSdk.registerAthlete(ticket.value, toCreatePayload(form));
        toast.show({ variant: 'success', message: t('tickets.athleteRegister.successRegister') });
      } else {
        if (!existingAthlete?.id) throw new Error('missing athlete id');
        await athleteSdk.simpleEdit({
          athleteId: existingAthlete.id,
          payload: toSimpleEditBody(form),
        });
        toast.show({ variant: 'success', message: t('tickets.athleteRegister.successUpdate') });
      }
      router.back();
    } catch (e) {
      if (e instanceof FetcherError && e.status === 401) return;
      toast.show({ variant: 'error', message: t('tickets.athleteRegister.failed') });
    } finally {
      setSubmitting(false);
    }
  }, [mode, form, ticket?.value, existingAthlete?.id, router, t, toast]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
        <Header
          title={t('tickets.editAthlete')}
          leading="close"
          onLeadingPress={() => router.back()}
        />
        <View style={{ padding: tokens.space[4], gap: tokens.space[3] }}>
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={200} />
        </View>
      </View>
    );
  }

  const canSubmit = dirty && !submitting && !!form.firstName && !!form.lastName && !!form.email;

  return (
    <>
      <Header
        title={mode === 'register' ? t('tickets.athleteRegister.title') : t('tickets.editAthlete')}
        leading="close"
        onLeadingPress={() => router.back()}
        actions={[
          {
            icon: dirty && !submitting ? '✓' : ' ',
            label: t('common.save'),
            onPress: canSubmit ? submit : () => {},
          },
        ]}
      />
      <FormLayout
        stickyBottom={
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!canSubmit}
            loading={submitting}
            onPress={submit}
          >
            {mode === 'register'
              ? t('tickets.athleteRegister.submitRegister')
              : t('tickets.athleteRegister.submitUpdate')}
          </Button>
        }
      >
        {mode === 'register' && (
          <>
            <Banner variant="info" message={t('tickets.athleteRegister.subtitle')} />
            <Button variant="outline" size="md" onPress={openProfilePicker}>
              {t('tickets.athleteRegister.useProfile')}
            </Button>
          </>
        )}

        <FormSection title="Email & giấy tờ">
          <Input
            label={t('profile.emailReadOnly')}
            value={form.email}
            readOnly={mode === 'edit'}
            onChangeText={(v) => set('email', v)}
          />
          <Input
            label={t('checkout.idNumber')}
            required
            value={form.idNumber}
            onChangeText={(v) => set('idNumber', v)}
            readOnly={mode === 'edit'}
          />
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
          <Input
            label={t('profile.dob')}
            required
            placeholder="YYYY-MM-DD"
            value={form.dob}
            onChangeText={(v) => set('dob', v)}
          />
          <Input
            label={t('profile.gender')}
            required
            placeholder="male | female | other"
            value={form.gender}
            onChangeText={(v) => set('gender', (v as FormState['gender']) || 'male')}
          />
          <Input
            label={t('profile.nationality')}
            required
            value={form.nationality}
            onChangeText={(v) => set('nationality', v)}
          />
          <Input
            label={t('profile.address')}
            value={form.address}
            onChangeText={(v) => set('address', v)}
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
          <Input
            label="Club"
            value={form.club}
            onChangeText={(v) => set('club', v)}
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

        <FormSection title={t('checkout.healthOptional')}>
          <Input
            label={t('checkout.bloodType')}
            value={form.bloodType}
            onChangeText={(v) => set('bloodType', v)}
          />
          <Input
            label={t('checkout.medicalInfo')}
            variant="textarea"
            value={form.medicalInformation}
            onChangeText={(v) => set('medicalInformation', v)}
            maxLength={500}
            charCounter
          />
          <Input
            label={t('checkout.currentMedication')}
            variant="textarea"
            value={form.currentMedication}
            onChangeText={(v) => set('currentMedication', v)}
            maxLength={500}
            charCounter
          />
        </FormSection>
      </FormLayout>

      <BottomSheet
        open={profilesOpen}
        onClose={() => setProfilesOpen(false)}
        title={t('tickets.athleteRegister.selectProfile')}
      >
        <View style={{ padding: tokens.space[4], gap: tokens.space[3] }}>
          {profilesLoading && <Skeleton height={48} />}
          {!profilesLoading && (profiles?.length ?? 0) === 0 && (
            <Text style={{ color: tokens.color.neutral600 }}>
              {t('tickets.athleteRegister.noProfiles')}
            </Text>
          )}
          {!profilesLoading &&
            profiles?.map((p) => (
              <Button
                key={p.id}
                variant="outline"
                size="md"
                onPress={() => applyProfile(p)}
              >
                {p.name} · {p.email}
              </Button>
            ))}
        </View>
      </BottomSheet>
    </>
  );
}
