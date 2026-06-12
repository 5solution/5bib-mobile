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
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Header } from '../../../src/components/Header';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { Banner } from '../../../src/components/ErrorState';
import { Skeleton } from '../../../src/components/Skeleton';
import { FormLayout, FormSection } from '../../../src/components/FormLayout';
import { BottomSheet } from '../../../src/components/BottomSheet';
import { DateField } from '../../../src/components/DateField';
import { ChipSelect } from '../../../src/components/ChipSelect';
import { SegmentedTabs } from '../../../src/components/domain/SegmentedTabs';
import { useToast } from '../../../src/components/Toast';
import { tokens } from '../../../src/theme/tokens';
import { toDDMMYYYY, toIsoDate } from '../../../src/utils/date';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { ticket as ticketSdk } from '../../../src/sdk/services/ticket';
import { athlete as athleteSdk } from '../../../src/sdk/services/athlete';
import { profile as profileSdk } from '../../../src/sdk/services/profile';
import { FetcherError } from '../../../src/sdk/core';
import type { Athlete, AthleteCreatePayload, GuardianPayload, Profile, Ticket } from '../../../src/sdk/models';
import {
  DEFAULT_TSHIRT_SIZES,
  GUARDIAN_RELATIONS,
} from '../../../src/sdk/constants/athlete';
import { calcAgeAt, localTodayIso } from '../../../src/sdk/validations/checkout';

// Mirrors checkout's guardian contact rules so the same BE field gets the
// same format regardless of which screen wrote it (+84-normalized phone,
// real email) — review caught the two screens diverging.
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VN_PHONE_RX = /^(0|\+84)?[35789][0-9]{8}$/;
function normalizeGuardianPhone(raw: string): string {
  const s = raw.trim();
  if (s.startsWith('+84')) return s;
  if (s.startsWith('0')) return '+84' + s.slice(1);
  if (/^[35789][0-9]{8}$/.test(s)) return '+84' + s;
  return s;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** ISO YYYY-MM-DD in state — converted to DD/MM/YYYY at the wire. */
  dob: string;
  gender: 'male' | 'female' | 'other';
  nationality: string;
  idNumber: string;
  /** Single size field — backend stores it as `racekit`; `tshirt_size` is dead. */
  racekit: string;
  nameOnBib: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bloodType: string;
  medicalInformation: string;
  currentMedication: string;
  address: string;
  club: string;
  // Guardian (người giám hộ) — required when the athlete is under 18.
  guardianName: string;
  guardianDob: string; // ISO YYYY-MM-DD
  guardianIdentity: string;
  guardianEmail: string;
  guardianPhone: string;
  guardianRelation: string;
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
  racekit: 'M',
  nameOnBib: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  bloodType: '',
  medicalInformation: '',
  currentMedication: '',
  address: '',
  club: '',
  guardianName: '',
  guardianDob: '',
  guardianIdentity: '',
  guardianEmail: '',
  guardianPhone: '',
  guardianRelation: '',
};

function fromAthlete(a: Athlete | null, fallbackEmail: string): FormState {
  if (!a) return { ...EMPTY, email: fallbackEmail };
  // Some records carry only the composed `name` (no first/last split) —
  // fall back to splitting it so required fields aren't blank in edit mode.
  const nameParts = (a.name ?? '').trim().split(/\s+/);
  const fallbackFirst = nameParts[0] ?? '';
  const fallbackLast = nameParts.slice(1).join(' ');
  return {
    firstName: a.firstName ?? fallbackFirst,
    lastName: a.lastName ?? fallbackLast,
    email: a.email ?? fallbackEmail,
    phone: a.contactPhone ?? '',
    dob: toIsoDate(a.dob),
    gender:
      a.gender === 'MALE'
        ? 'male'
        : a.gender === 'FEMALE'
          ? 'female'
          : 'other',
    nationality: a.nationality ?? 'Vietnam',
    idNumber: a.idNumber ?? '',
    racekit: a.racekit ?? 'M',
    nameOnBib: a.nameOnBib ?? '',
    // sosPhone packed as "phone-name" by SDK mapper.
    emergencyContactPhone: (a.sosPhone ?? '').split('-')[0] ?? '',
    emergencyContactName: (a.sosPhone ?? '').split('-').slice(1).join('-') ?? '',
    // Guardian prefill — read back from athlete_represent (normalizer maps it).
    guardianName: a.guardianName ?? '',
    guardianDob: toIsoDate(a.guardianDob ?? ''),
    guardianIdentity: a.guardianIdentity ?? '',
    guardianEmail: a.guardianEmail ?? '',
    guardianPhone: a.guardianPhone ?? '',
    guardianRelation: a.guardianRelation ?? '',
    bloodType: a.bloodType ?? '',
    medicalInformation: a.medicalInfo ?? '',
    currentMedication: a.currentMedication ?? '',
    address: a.address ?? '',
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
    dob: toIsoDate(get('dob')),
    gender: (get('gender') as FormState['gender']) || 'male',
    nationality: get('nationality') || 'Vietnam',
    idNumber: get('idNumber') || get('id_number'),
    racekit: get('racekit') || get('tshirtSize') || get('tshirt_size') || 'M',
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

/** Web parity (useAthleteField): guardian needed when athlete < 18 today. */
function needsGuardian(dobIso: string): boolean {
  if (!dobIso) return false;
  return calcAgeAt(dobIso, localTodayIso()) < 18;
}

function buildGuardian(f: FormState): GuardianPayload | undefined {
  if (!needsGuardian(f.dob)) return undefined;
  return {
    name: f.guardianName.trim(),
    dob: f.guardianDob,
    identity: f.guardianIdentity.trim(),
    email: f.guardianEmail.trim(),
    phone: normalizeGuardianPhone(f.guardianPhone),
    relation: f.guardianRelation,
  };
}

function toCreatePayload(f: FormState): AthleteCreatePayload {
  return {
    guardian: buildGuardian(f),
    firstName: f.firstName,
    lastName: f.lastName,
    email: f.email,
    phone: f.phone,
    dob: f.dob, // ISO here — the SDK register mapper converts to DD/MM/YYYY
    gender: f.gender,
    nationality: f.nationality,
    idNumber: f.idNumber,
    tshirtSize: f.racekit, // model compat — backend only reads `racekit`
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

/**
 * Build the partial body used by simpleEdit — keys mirror backend snake_case.
 *
 * Wire rules verified live 2026-06-11 (athlete 11251):
 *   - `dob` MUST be DD/MM/YYYY (Java LocalDate; ISO → 400 parse error)
 *   - `racekit` MUST be omitted when the race has racekit_edit_enable=false
 *     ("Cannot edit racekit for this race") — web gates the same way
 *   - `tshirt_size` is a dead field backend never reads — dropped
 */
function toSimpleEditBody(
  f: FormState,
  racekitEditable: boolean,
  guardianExtras?: Record<string, unknown>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    first_name: f.firstName,
    last_name: f.lastName,
    name: `${f.firstName} ${f.lastName}`.trim(),
    contact_phone: f.phone,
    dob: toDDMMYYYY(f.dob),
    gender: f.gender.toUpperCase(),
    name_on_bib: f.nameOnBib,
    sos_phone: `${f.emergencyContactPhone}-${f.emergencyContactName}`,
    sosPhone: `${f.emergencyContactPhone}-${f.emergencyContactName}`,
    medical_info: f.medicalInformation,
    current_medication: f.currentMedication,
    blood_type: f.bloodType,
    club: f.club,
    address: f.address,
  };
  if (racekitEditable) body.racekit = f.racekit;
  // Under-18 → guardian rides as athlete_represent (wire verified live
  // 2026-06-12 on athlete 11655: simple-edit persisted represent_id).
  // ⚠️ BE FULL-REPLACES this object (a partial write wipes the rest —
  // observed live), so echo back the fields mobile doesn't edit
  // (guardian_shirt_size/bib_name/address/sex from web FAMILY/KID regs).
  const g = buildGuardian(f);
  if (g) {
    body.athlete_represent = {
      ...(guardianExtras ?? {}),
      name: g.name,
      idpp: g.identity,
      email: g.email,
      guardian_name: g.name,
      guardian_dob: toDDMMYYYY(g.dob),
      guardian_card_id: g.identity,
      guardian_email: g.email,
      guardian_phone_number: g.phone,
      guardian_relationship: g.relation,
    };
  }
  return body;
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

  // Web parity: edit page only sends `racekit` when the race explicitly
  // enables it (ticket?.race?.racekit_edit_enable). Backend rejects the whole
  // payload otherwise ("Cannot edit racekit for this race").
  const racekitEditable = ticket?.race?.racekitEditEnable === true;

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
          payload: toSimpleEditBody(
            form,
            racekitEditable,
            existingAthlete.guardianExtras,
          ),
        });
        toast.show({ variant: 'success', message: t('tickets.athleteRegister.successUpdate') });
      }
      router.back();
    } catch (e) {
      if (e instanceof FetcherError && e.status === 401) return;
      // Surface the backend's message (e.g. "Cannot edit racekit for this
      // race") instead of the generic failure toast.
      const backendMsg =
        e instanceof FetcherError
          ? (() => {
              const r = e.response as Record<string, unknown> | undefined;
              const errObj = (r?.error ?? r) as Record<string, unknown> | undefined;
              return typeof errObj?.message === 'string' ? errObj.message : undefined;
            })()
          : undefined;
      toast.show({
        variant: 'error',
        message: (backendMsg ?? t('tickets.athleteRegister.failed')).slice(0, 140),
      });
    } finally {
      setSubmitting(false);
    }
  }, [mode, form, ticket, existingAthlete?.id, racekitEditable, router, t, toast]);

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

  // ── Guard (Danny 2026-06-11): editing is status- AND time-gated by BE
  // config. Web parity: EditTicket renders only for REGISTER/REMIND_CHECK_IN
  // and toasts "Đã qua thời gian thay đổi thông tin vé" past
  // race.registration_end_time. Screen-level guard also covers deep links —
  // a CHECKED_IN ticket must never reach this form.
  const statusRaw = String(ticket?.athleteStatus ?? '').toUpperCase();
  const statusEditable =
    mode === 'register' ||
    statusRaw === 'REGISTER' ||
    statusRaw === 'REMIND_CHECK_IN' ||
    statusRaw === 'NEW';
  const regEndRaw = ticket?.race?.registrationEndTime;
  const editTimeOver =
    !!regEndRaw && Date.now() > new Date(regEndRaw).getTime();

  if (ticket && (!statusEditable || editTimeOver)) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
        <Header
          title={t('tickets.editAthlete')}
          leading="close"
          onLeadingPress={() => router.back()}
        />
        <Banner
          variant="warning"
          message={
            editTimeOver ? t('tickets.editTimeOver') : t('tickets.editNotAllowed')
          }
        />
        <View style={{ padding: tokens.space[4] }}>
          <Button variant="outline" fullWidth onPress={() => router.back()}>
            {t('common.back')}
          </Button>
        </View>
      </View>
    );
  }

  const guardianRequired = needsGuardian(form.dob);
  const guardianIsAdult =
    !!form.guardianDob &&
    calcAgeAt(
      form.guardianDob,
      ticket?.race?.startDate || localTodayIso(),
    ) >= 18;
  const guardianOk =
    !guardianRequired ||
    (!!form.guardianName.trim() &&
      guardianIsAdult &&
      form.guardianIdentity.trim().length >= 6 &&
      EMAIL_RX.test(form.guardianEmail.trim()) &&
      VN_PHONE_RX.test(form.guardianPhone.trim()) &&
      !!form.guardianRelation);

  const canSubmit =
    dirty && !submitting && !!form.firstName && !!form.lastName && !!form.email && guardianOk;

  return (
    <>
      <Header
        title={mode === 'register' ? t('tickets.athleteRegister.title') : t('tickets.editAthlete')}
        leading="close"
        onLeadingPress={() => router.back()}
        actions={[
          {
            // Icon must mirror canSubmit — `dirty` alone rendered an
            // actionable-looking ✓ whose taps were silently dropped while
            // validation (e.g. incomplete guardian) blocked submit.
            icon: canSubmit ? '✓' : ' ',
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

        <FormSection title={t('tickets.athleteRegister.sectionDocs')}>
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
          <DateField
            label={t('profile.dob')}
            required
            value={form.dob}
            onChange={(iso) => set('dob', iso)}
          />
          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: tokens.fontSize.labelMd,
                fontWeight: tokens.fontWeight.medium,
                color: tokens.color.neutral700,
              }}
            >
              {t('profile.gender.label')}
              <Text style={{ color: tokens.color.error }}> *</Text>
            </Text>
            <SegmentedTabs
              options={[
                { id: 'male', label: t('profile.gender.male') },
                { id: 'female', label: t('profile.gender.female') },
                { id: 'other', label: t('profile.gender.other') },
              ]}
              value={form.gender}
              onChange={(v) => set('gender', v as FormState['gender'])}
            />
          </View>
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

        <FormSection title={t('checkout.apparelSection')}>
          {/* Single size field — backend stores the shirt size in `racekit`
             (`tshirt_size` is a dead column, verified live 2026-06-11).
             Options come from the race's t_shirt_sizes config (web parity);
             read-only when the race forbids racekit edits, matching the
             server rule that rejects the whole payload otherwise. */}
          <ChipSelect
            label={t('checkout.tshirtSize')}
            required
            readOnly={mode === 'edit' && !racekitEditable}
            helper={
              mode === 'edit' && !racekitEditable
                ? t('tickets.athleteRegister.racekitLocked')
                : undefined
            }
            options={
              ticket?.race?.tshirtSizes?.length
                ? ticket.race.tshirtSizes
                : DEFAULT_TSHIRT_SIZES
            }
            value={form.racekit}
            onChange={(v) => set('racekit', v)}
          />
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

        {/* Guardian — required for under-18 athletes (web parity: edit page
           uses the same useAthleteField condition; payload nests
           athlete_represent, verified live 2026-06-12). */}
        {guardianRequired && (
          <FormSection title={t('checkout.guardian.section')}>
            <Banner variant="info" message={t('checkout.guardian.hint')} />
            <Input
              label={t('checkout.guardian.name')}
              required
              value={form.guardianName}
              onChangeText={(v) => set('guardianName', v)}
            />
            <DateField
              label={t('checkout.guardian.dob')}
              required
              value={form.guardianDob}
              onChange={(v) => set('guardianDob', v)}
            />
            {!!form.guardianDob && !guardianIsAdult && (
              <Text
                style={{
                  fontSize: tokens.fontSize.labelSm,
                  color: tokens.color.error,
                }}
              >
                {t('checkout.guardian.mustBeAdult')}
              </Text>
            )}
            <Input
              label={t('checkout.guardian.identity')}
              required
              value={form.guardianIdentity}
              onChangeText={(v) => set('guardianIdentity', v)}
              error={
                form.guardianIdentity.trim() &&
                form.guardianIdentity.trim().length < 6
                  ? t('validation.required')
                  : undefined
              }
            />
            <Input
              label={t('checkout.guardian.email')}
              required
              variant="email"
              value={form.guardianEmail}
              onChangeText={(v) => set('guardianEmail', v)}
              error={
                form.guardianEmail.trim() &&
                !EMAIL_RX.test(form.guardianEmail.trim())
                  ? t('validation.emailInvalid')
                  : undefined
              }
            />
            <Input
              label={t('checkout.guardian.phone')}
              required
              variant="phone"
              value={form.guardianPhone}
              onChangeText={(v) => set('guardianPhone', v)}
              error={
                form.guardianPhone.trim() &&
                !VN_PHONE_RX.test(form.guardianPhone.trim())
                  ? t('validation.phoneInvalid')
                  : undefined
              }
            />
            <ChipSelect
              label={t('checkout.guardian.relation')}
              required
              options={GUARDIAN_RELATIONS}
              value={form.guardianRelation}
              onChange={(v) => set('guardianRelation', v)}
            />
          </FormSection>
        )}

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
