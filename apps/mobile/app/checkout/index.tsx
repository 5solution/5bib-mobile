/**
 * apps/mobile/app/checkout/index.tsx — Checkout flow
 *
 * Single screen orchestrates S-CHECKOUT-01/02/03 in 3 steps via local state.
 * Auto-saves draft to AsyncStorage with TTL 24h (BR-CHECKOUT-16).
 *
 * Wires real SDK calls (race-course list, price-rule validate, order.createOrder)
 * and navigates to /checkout/payment-webview after successful order creation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Card } from '../../src/components/Card';
import { Stepper } from '../../src/components/domain/Stepper';
import { CourseCard } from '../../src/components/domain/CourseCard';
import {
  PaymentMethodPicker,
  PaymentMethodId,
  PaymentMethodOption,
} from '../../src/components/PaymentMethodPicker';
import { FormLayout, FormSection, SectionDivider } from '../../src/components/FormLayout';
import { useToast } from '../../src/components/Toast';
import { useOnline, useDraftPersist } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import { raceCourse, priceRule, order } from '../../src/sdk';
import type {
  RaceCourse,
  OrderCreateInput,
  PaymentGateway,
} from '../../src/sdk/models';
import { useCheckoutStore } from '../../src/stores/useCheckoutStore';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VN_PHONE_RX = /^(0|\+84)[35789][0-9]{8}$/;

interface AthleteForm {
  mode: 'self' | 'represent';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string; // YYYY-MM-DD
  gender: 'male' | 'female' | 'other' | '';
  nationality: string;
  idNumber: string;
  tshirtSize: string;
  racekit: string;
  nameOnBib: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  delegatorName?: string;
  delegatorPhone?: string;
  delegatorEmail?: string;
  delegatorCccd?: string;
}

/** Map UI picker id → backend payment gateway (URL path slug). */
const PICKER_TO_GATEWAY: Record<PaymentMethodId, PaymentGateway> = {
  PAYX_QR: 'payx',
  PAYX_ATM: 'payx',
  VNPAY_QR: 'vnpay',
  NAPAS: 'vnpay',
  VISA_VNPAY: 'vnpay',
  ONEPAY_INTL: 'onepay',
  PAYOO_WALLET: 'payoo',
};

const PAYMENT_OPTIONS: PaymentMethodOption[] = [
  { id: 'VNPAY_QR', label: 'VNPay', description: 'QR / ATM / Visa', logoText: 'VNPay' },
  { id: 'PAYX_QR', label: 'PayX', description: 'Quét QR · 24/7', logoText: 'PayX' },
  { id: 'PAYOO_WALLET', label: 'Payoo', description: 'Ví điện tử', logoText: 'Payoo' },
  { id: 'ONEPAY_INTL', label: 'OnePay', description: 'Thẻ quốc tế', logoText: 'OnePay' },
];

function fmtVnd(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const { race_id, course_id, ticket_type_id } = useLocalSearchParams<{
    race_id?: string;
    course_id?: string;
    ticket_type_id?: string;
  }>();

  const raceId = race_id ?? '';
  const initialCourseId = course_id ?? '';
  const initialTicketTypeId = ticket_type_id ?? '';

  // Persistent checkout store (multi-step state, draft sync).
  const checkoutStore = useCheckoutStore();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [courses, setCourses] = useState<RaceCourse[] | null>(null);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId);
  // Per-tier ticket selection — race 305 has 4 ticket_types in the ELB course
  // tier (Family/Thường/Ultra etc.) with different prices + stock. Web shows
  // all tiers; mobile MUST persist the choice into createOrder.
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string>(initialTicketTypeId);

  const [form, setForm] = useState<AthleteForm>({
    mode: 'self',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    nationality: 'Việt Nam',
    idNumber: '',
    tshirtSize: '',
    racekit: '',
    nameOnBib: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  const [discountCode, setDiscountCode] = useState('');
  const [discountValidating, setDiscountValidating] = useState(false);
  const [discountApplied, setDiscountApplied] = useState<{ amount: number; code: string } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>('VNPAY_QR');
  const [includeInsurance, setIncludeInsurance] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);

  // Draft persist scoped to race + course (BR-CHECKOUT-16, 24h TTL).
  const draft = useDraftPersist<AthleteForm>(
    `draft_checkout_${raceId}_${selectedCourseId || 'pending'}`,
    24,
  );

  // Sync race id into checkout store on mount.
  useEffect(() => {
    if (raceId) checkoutStore.setRace(raceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceId]);

  // Load courses for race.
  useEffect(() => {
    if (!raceId) {
      setCoursesError(t('errors.generic'));
      setCourses([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await raceCourse.listCoursesByRace(raceId);
        if (cancelled) return;
        setCourses(list);
        // Auto-select course + first available ticket_type if user arrived
        // without specifying them via query params.
        if (list.length > 0) {
          const initialCourse =
            list.find((c) => c.id === selectedCourseId) ?? list[0]!;
          if (!selectedCourseId) {
            setSelectedCourseId(initialCourse.id);
          }
          if (!selectedTicketTypeId && initialCourse.ticketTypes?.length) {
            setSelectedTicketTypeId(initialCourse.ticketTypes[0]!.id);
          }
        }
      } catch {
        if (cancelled) return;
        setCoursesError(t('errors.generic'));
        setCourses([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceId]);

  // Restore draft on mount once a course is selected.
  useEffect(() => {
    if (!selectedCourseId) return;
    (async () => {
      const restored = await draft.restore();
      if (restored) {
        setForm(restored);
        toast.show({ variant: 'info', message: t('checkout.draftRestored') });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  // Auto-save draft (debounced 1s) when in athlete step.
  useEffect(() => {
    if (step !== 1 || !selectedCourseId) return;
    const id = setTimeout(() => {
      draft.save(form);
      checkoutStore.saveDraft();
    }, 1000);
    return () => clearTimeout(id);
  }, [form, step, selectedCourseId, draft, checkoutStore]);

  // Sync course/payment changes into store.
  useEffect(() => {
    if (selectedCourseId) checkoutStore.setCourse(selectedCourseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  const selectedCourse: RaceCourse | undefined = courses?.find(
    (c) => c.id === selectedCourseId,
  );
  const selectedTicketType = selectedCourse?.ticketTypes?.find(
    (tt) => tt.id === selectedTicketTypeId,
  );
  // Price source-of-truth: per-tier ticket_type when present, else course
  // headline price (single-tier fallback). Verified 2026-05-28 — `course.price`
  // is always null at backend top-level; real price lives in ticket_types[].
  const subtotalEarly = selectedTicketType?.price ?? selectedCourse?.price ?? 0;

  // applyDiscount declared HERE (before early-return guards) so React hook
  // count stays consistent across renders. Was at line ~261 → "Rendered more
  // hooks than during the previous render" crash when courses loaded.
  const applyDiscountCb = useCallback(async () => {
    const code = discountCode.trim();
    if (!code) return;
    setDiscountError(null);
    setDiscountValidating(true);
    try {
      const rule = (await priceRule.getByCode(code)) as
        | { endDate?: string; value?: number; type?: 'percentage' | 'fixed' }
        | null;
      if (!rule) {
        setDiscountApplied(null);
        setDiscountError(t('checkout.errors.discountInvalid'));
        toast.show({ variant: 'error', message: t('checkout.discount.invalid') });
        return;
      }
      if (rule.endDate && Date.parse(rule.endDate) < Date.now()) {
        setDiscountApplied(null);
        setDiscountError(t('checkout.discount.expired'));
        toast.show({ variant: 'error', message: t('checkout.discount.expired') });
        return;
      }
      const value = rule.value ?? 0;
      const amount = rule.type === 'percentage'
        ? Math.round((subtotalEarly * value) / 100)
        : value;
      const next = { amount, code };
      setDiscountApplied(next);
      checkoutStore.applyDiscount({ code, amount, valid: true });
      toast.show({
        variant: 'success',
        message: t('checkout.discountAppliedFmt', { amount: amount.toLocaleString('vi-VN') }),
      });
    } catch {
      setDiscountApplied(null);
      setDiscountError(t('errors.generic'));
    } finally {
      setDiscountValidating(false);
    }
  }, [discountCode, subtotalEarly, checkoutStore, t, toast]);

  // Loading / empty-state guard — shows spinner until courses load.
  if (!courses) {
    return (
      <>
        <Header
          title={t('checkout.step1Title')}
          leading="back"
          onLeadingPress={() => router.back()}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={tokens.color.brandPrimary} />
        </View>
      </>
    );
  }

  if (courses.length === 0 || coursesError) {
    return (
      <>
        <Header
          title={t('checkout.step1Title')}
          leading="back"
          onLeadingPress={() => router.back()}
        />
        <View style={{ padding: tokens.space[4] }}>
          <Banner variant="error" message={coursesError ?? t('errors.generic')} />
        </View>
      </>
    );
  }

  // Once courses are populated, fall back to first if selection is empty/stale.
  const activeCourse: RaceCourse = selectedCourse ?? courses[0]!;
  const subtotal = activeCourse.price;
  const insuranceFee = includeInsurance ? 0 : 0; // Fee TBD by backend; UI flag only for now.
  const total = Math.max(0, subtotal + insuranceFee - (discountApplied?.amount ?? 0));

  const validateAthlete = (): boolean => {
    if (form.firstName.trim().length < 1) return false;
    if (form.lastName.trim().length < 1) return false;
    if (!EMAIL_RX.test(form.email.trim())) return false;
    if (!VN_PHONE_RX.test(form.phone)) return false;
    if (!form.dob) return false;
    if (!form.gender) return false;
    if (!form.idNumber) return false;
    if (!form.tshirtSize) return false;
    if (!form.nameOnBib) return false;
    if (!form.emergencyContactName) return false;
    if (!VN_PHONE_RX.test(form.emergencyContactPhone)) return false;
    if (form.mode === 'represent') {
      if (!form.delegatorName) return false;
      if (!VN_PHONE_RX.test(form.delegatorPhone ?? '')) return false;
      if (!EMAIL_RX.test(form.delegatorEmail ?? '')) return false;
      if (!form.delegatorCccd) return false;
    }
    return true;
  };

  // applyDiscount alias for hooks-above-return refactor (real impl: applyDiscountCb declared earlier).
  const applyDiscount = applyDiscountCb;

  const buildOrderInput = (): OrderCreateInput => ({
    raceId,
    courseId: activeCourse.id,
    // ticketTypeId is what tells backend WHICH tier (Family/ELB/VIP) the user
    // bought — without it, all orders default to ticket_types[0] which means
    // users can't actually purchase the higher tiers they selected on the UI.
    ...(selectedTicketTypeId ? { ticketTypeId: selectedTicketTypeId } : {}),
    athlete: {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone,
      dob: form.dob,
      gender: (form.gender || 'other') as 'male' | 'female' | 'other',
      nationality: form.nationality,
      idNumber: form.idNumber,
      tshirtSize: form.tshirtSize,
      racekit: form.racekit || form.tshirtSize,
      nameOnBib: form.nameOnBib,
      emergencyContactName: form.emergencyContactName,
      emergencyContactPhone: form.emergencyContactPhone,
    },
    ...(discountApplied ? { discountCode: discountApplied.code } : {}),
    includedInsurance: includeInsurance,
  });

  const submitOrder = async () => {
    // Debounce: ignore re-tap while in-flight (BR-CHECKOUT — backend has no idempotency key).
    if (submitting) return;
    if (!paymentMethod) return;
    if (!online) {
      toast.show({ variant: 'error', message: t('errors.network') });
      return;
    }
    setSubmitting(true);
    try {
      const input = buildOrderInput();
      const created = await order.createOrder(input);
      await draft.clear();
      const gateway = PICKER_TO_GATEWAY[paymentMethod];
      checkoutStore.selectPaymentMethod(
        gateway === 'vnpay' ? 'VNPAY' : gateway === 'payoo' ? 'PAYOO' : null,
      );
      router.push({
        pathname: '/checkout/payment-webview',
        params: { order_id: created.orderId, gateway },
      });
    } catch {
      toast.show({ variant: 'error', message: t('checkout.errors.createOrderFailed') });
    } finally {
      setSubmitting(false);
    }
  };

  // DEV-only: bypass real gateway, mark order paid via fake-payment endpoint.
  const submitFakePayment = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const input = buildOrderInput();
      const created = await order.createOrder(input);
      await order.fakePayment(created.orderId, total, input.athlete.email);
      await draft.clear();
      router.push({
        pathname: '/checkout/result',
        params: { order_id: created.orderId, status: 'paid' },
      });
    } catch {
      toast.show({ variant: 'error', message: t('checkout.errors.createOrderFailed') });
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = [t('checkout.step1Title'), t('checkout.step2Title'), t('checkout.step3Title')];

  return (
    <>
      <Header
        title={t('common.continue')}
        leading="back"
        onLeadingPress={() => (step === 0 ? router.back() : setStep((step - 1) as 0 | 1))}
      />
      <Stepper steps={stepLabels} current={step} />
      {!online && <Banner variant="warning" message={t('errors.network')} />}

      {step === 0 && (
        <FormLayout
          stickyBottom={
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!selectedCourseId}
              onPress={() => setStep(1)}
            >
              {t('common.continue')}
            </Button>
          }
        >
          <FormSection title={t('checkout.selectedCourse')}>
            {/* Flatten course × ticket_type. Tier label: ticket_type.type_name
               when course has >1 tiers (real tier pricing like Early Bird /
               Regular), else course.name as a distinguishing label (race 305
               pattern where all ticket_types share type_name="ELB"). */}
            {courses.flatMap((c) => {
              const tts = c.ticketTypes ?? [];
              if (tts.length > 1) {
                return tts.map((tt) => (
                  <CourseCard
                    key={`${c.id}:${tt.id}`}
                    course={{
                      id: `${c.id}:${tt.id}`,
                      distance: c.distance || c.name,
                      tierName: tt.typeName || undefined,
                      price: tt.price,
                      availableSlots: tt.remainedTicket ?? undefined,
                    }}
                    selected={
                      selectedCourseId === c.id &&
                      selectedTicketTypeId === tt.id
                    }
                    asRadio
                    onPress={() => {
                      setSelectedCourseId(c.id);
                      setSelectedTicketTypeId(tt.id);
                    }}
                  />
                ));
              }
              const tt = tts[0];
              const tierName =
                c.name && c.name !== c.distance ? c.name : undefined;
              return [
                <CourseCard
                  key={tt ? `${c.id}:${tt.id}` : c.id}
                  course={{
                    id: tt ? `${c.id}:${tt.id}` : c.id,
                    distance: c.distance || c.name,
                    tierName,
                    price: tt?.price ?? c.price,
                    availableSlots:
                      tt?.remainedTicket ?? c.availableSlots ?? undefined,
                  }}
                  selected={
                    selectedCourseId === c.id &&
                    (tt ? selectedTicketTypeId === tt.id : true)
                  }
                  asRadio
                  onPress={() => {
                    setSelectedCourseId(c.id);
                    setSelectedTicketTypeId(tt?.id ?? '');
                  }}
                />,
              ];
            })}
          </FormSection>
        </FormLayout>
      )}

      {step === 1 && (
        <FormLayout
          stickyBottom={
            <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
              <Button variant="outline" size="lg" onPress={() => setStep(0)}>
                {t('common.back')}
              </Button>
              <View style={{ flex: 1 }}>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!validateAthlete()}
                  onPress={() => setStep(2)}
                >
                  {t('common.continue')}
                </Button>
              </View>
            </View>
          }
        >
          {/* Mode segmented */}
          <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
            {(['self', 'represent'] as const).map((m) => {
              const active = form.mode === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => setForm({ ...form, mode: m })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  style={{
                    flex: 1,
                    paddingVertical: tokens.space[3],
                    borderRadius: tokens.radius.md,
                    backgroundColor: active ? tokens.color.brandPrimary : tokens.color.neutral100,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: active ? tokens.color.neutral0 : tokens.color.neutral700,
                      fontWeight: tokens.fontWeight.semibold,
                    }}
                  >
                    {m === 'self' ? t('checkout.modeSelf') : t('checkout.modeRepresent')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <FormSection title={t('checkout.personalInfo')}>
            <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('checkout.firstName')}
                  required
                  value={form.firstName}
                  onChangeText={(v) => setForm({ ...form, firstName: v })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('checkout.lastName')}
                  required
                  value={form.lastName}
                  onChangeText={(v) => setForm({ ...form, lastName: v })}
                />
              </View>
            </View>
            <Input
              label={t('auth.email')}
              required
              variant="email"
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
            />
            <Input
              label={t('auth.phone')}
              required
              variant="phone"
              value={form.phone}
              onChangeText={(v) => setForm({ ...form, phone: v })}
            />
            <Input
              label={t('profile.dob')}
              required
              placeholder="YYYY-MM-DD"
              value={form.dob}
              onChangeText={(v) => setForm({ ...form, dob: v })}
            />
            <View style={{ gap: tokens.space[2] }}>
              <Text
                style={{
                  fontSize: tokens.fontSize.labelMd,
                  fontWeight: tokens.fontWeight.semibold,
                  color: tokens.color.neutral700,
                }}
              >
                {t('profile.gender.label')} *
              </Text>
              <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
                {(['male', 'female', 'other'] as const).map((g) => {
                  const active = form.gender === g;
                  return (
                    <Pressable
                      key={g}
                      onPress={() => setForm({ ...form, gender: g })}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      style={{
                        flex: 1,
                        paddingVertical: tokens.space[3],
                        borderRadius: tokens.radius.md,
                        borderWidth: 1,
                        borderColor: active ? tokens.color.brandPrimary : tokens.color.neutral300,
                        backgroundColor: active ? tokens.color.brandPrimaryLight : 'transparent',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: active ? tokens.color.brandPrimary : tokens.color.neutral700,
                          fontWeight: tokens.fontWeight.semibold,
                        }}
                      >
                        {t(`profile.${g}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Input
              label={t('checkout.idNumber')}
              required
              value={form.idNumber}
              onChangeText={(v) => setForm({ ...form, idNumber: v })}
            />
          </FormSection>

          <FormSection title="Trang phục">
            <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('checkout.tshirtSize')}
                  required
                  value={form.tshirtSize}
                  onChangeText={(v) => setForm({ ...form, tshirtSize: v })}
                  placeholder="M"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label={t('checkout.bibRacekit')}
                  required
                  value={form.racekit}
                  onChangeText={(v) => setForm({ ...form, racekit: v })}
                  placeholder="Tiêu chuẩn"
                />
              </View>
            </View>
            <Input
              label={t('checkout.nameOnBib')}
              required
              maxLength={15}
              charCounter
              value={form.nameOnBib}
              onChangeText={(v) => setForm({ ...form, nameOnBib: v.toUpperCase() })}
            />
          </FormSection>

          <FormSection title={t('checkout.emergencyContact')}>
            <Input
              label={t('checkout.emergencyName')}
              required
              value={form.emergencyContactName}
              onChangeText={(v) => setForm({ ...form, emergencyContactName: v })}
            />
            <Input
              label={t('checkout.emergencyPhone')}
              required
              variant="phone"
              value={form.emergencyContactPhone}
              onChangeText={(v) => setForm({ ...form, emergencyContactPhone: v })}
            />
          </FormSection>

          {form.mode === 'represent' && (
            <FormSection title={t('checkout.delegatorSection')}>
              <Input
                label={t('checkout.delegatorName')}
                required
                value={form.delegatorName ?? ''}
                onChangeText={(v) => setForm({ ...form, delegatorName: v })}
              />
              <Input
                label={t('checkout.delegatorPhone')}
                required
                variant="phone"
                value={form.delegatorPhone ?? ''}
                onChangeText={(v) => setForm({ ...form, delegatorPhone: v })}
              />
              <Input
                label={t('checkout.delegatorEmail')}
                required
                variant="email"
                value={form.delegatorEmail ?? ''}
                onChangeText={(v) => setForm({ ...form, delegatorEmail: v })}
              />
              <Input
                label={t('checkout.delegatorCccd')}
                required
                value={form.delegatorCccd ?? ''}
                onChangeText={(v) => setForm({ ...form, delegatorCccd: v })}
              />
            </FormSection>
          )}
        </FormLayout>
      )}

      {step === 2 && (
        <FormLayout
          stickyBottom={
            <View style={{ gap: tokens.space[2] }}>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={!paymentMethod || submitting || !online}
                loading={submitting}
                onPress={submitOrder}
              >
                {submitting
                  ? t('checkout.creatingOrder')
                  : t('checkout.payWithAmountFmt', { amount: fmtVnd(total) })}
              </Button>
              {__DEV__ && (
                <Button
                  variant="outline"
                  size="lg"
                  fullWidth
                  disabled={submitting}
                  onPress={submitFakePayment}
                >
                  [DEV] Fake payment
                </Button>
              )}
            </View>
          }
        >
          <Card>
            <Text style={{ fontWeight: tokens.fontWeight.semibold, color: tokens.color.neutral900 }}>
              {activeCourse.name || activeCourse.distance}
            </Text>
            <Text style={{ color: tokens.color.neutral600 }}>
              {activeCourse.distance} · {form.firstName} {form.lastName}
            </Text>
          </Card>

          <FormSection title={t('checkout.discountCode')}>
            <View style={{ flexDirection: 'row', gap: tokens.space[2], alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Input
                  value={discountCode}
                  onChangeText={(v) => setDiscountCode(v.toUpperCase())}
                  placeholder="NHAPMA"
                  error={discountError ?? undefined}
                />
              </View>
              <Button
                variant="outline"
                size="lg"
                disabled={!discountCode.trim() || discountValidating}
                loading={discountValidating}
                onPress={applyDiscount}
              >
                {discountValidating ? t('checkout.discount.validating') : t('checkout.discountApply')}
              </Button>
            </View>
            {discountApplied && (
              <Text style={{ color: tokens.color.success, fontSize: tokens.fontSize.bodySm }}>
                ✓ {t('checkout.discount.valid')} —{' '}
                {t('checkout.discountAppliedFmt', {
                  amount: discountApplied.amount.toLocaleString('vi-VN'),
                })}
              </Text>
            )}
          </FormSection>

          <SectionDivider />

          <FormSection title={t('checkout.insurance.title')}>
            <Pressable
              onPress={() => setIncludeInsurance((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: includeInsurance }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: tokens.space[2],
                minHeight: tokens.touchTarget.minIOS,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: tokens.radius.sm,
                  borderWidth: 2,
                  borderColor: includeInsurance ? tokens.color.brandPrimary : tokens.color.neutral400,
                  backgroundColor: includeInsurance ? tokens.color.brandPrimary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {includeInsurance && (
                  <Text style={{ color: tokens.color.neutral0, fontWeight: '700' }}>✓</Text>
                )}
              </View>
              <Text
                style={{
                  fontSize: tokens.fontSize.bodyLg,
                  fontWeight: tokens.fontWeight.semibold,
                  color: tokens.color.neutral900,
                }}
              >
                {t('checkout.insurance.toggle')}
              </Text>
            </Pressable>
            <Text
              style={{
                fontSize: tokens.fontSize.bodySm,
                color: tokens.color.neutral600,
                marginTop: tokens.space[1],
              }}
            >
              {t('checkout.insurance.description')}
            </Text>
          </FormSection>

          <SectionDivider />

          <FormSection title={t('checkout.paymentDetails')}>
            <Row label={t('checkout.summary.subtotal')} value={fmtVnd(subtotal)} />
            {discountApplied && (
              <Row
                label={t('checkout.summary.discount')}
                value={`− ${fmtVnd(discountApplied.amount)}`}
              />
            )}
            {includeInsurance && (
              <Row label={t('checkout.summary.insurance')} value={fmtVnd(insuranceFee)} />
            )}
            <View style={{ height: 1, backgroundColor: tokens.color.neutral200 }} />
            <Row label={t('checkout.summary.total')} value={fmtVnd(total)} bold brand />
          </FormSection>

          <SectionDivider />

          <FormSection title={t('checkout.selectPaymentMethod')}>
            <PaymentMethodPicker
              options={PAYMENT_OPTIONS}
              value={paymentMethod}
              onChange={setPaymentMethod}
            />
          </FormSection>
        </FormLayout>
      )}
    </>
  );
}

function Row({
  label,
  value,
  bold,
  brand,
}: {
  label: string;
  value: string;
  bold?: boolean;
  brand?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text
        style={{
          color: tokens.color.neutral700,
          fontSize: bold ? tokens.fontSize.bodyLg : tokens.fontSize.bodyMd,
          fontWeight: bold ? tokens.fontWeight.semibold : tokens.fontWeight.regular,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: brand ? tokens.color.brandPrimary : tokens.color.neutral900,
          fontSize: bold ? tokens.fontSize.h3 : tokens.fontSize.bodyMd,
          fontWeight: bold ? tokens.fontWeight.bold : tokens.fontWeight.medium,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
