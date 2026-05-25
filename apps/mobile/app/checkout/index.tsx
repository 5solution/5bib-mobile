/**
 * apps/mobile/app/checkout/index.tsx — Checkout flow
 *
 * Single screen orchestrates S-CHECKOUT-01/02/03 in 3 steps via local state.
 * Auto-saves draft to AsyncStorage with TTL 24h (BR-CHECKOUT-16).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Card } from '../../src/components/Card';
import { Stepper } from '../../src/components/domain/Stepper';
import { CourseCard } from '../../src/components/domain/CourseCard';
import { PaymentMethodPicker, PaymentMethodId } from '../../src/components/PaymentMethodPicker';
import { FormLayout, FormSection, SectionDivider } from '../../src/components/FormLayout';
import { useToast } from '../../src/components/Toast';
import { useOnline, useDraftPersist } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';

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

const PAYMENT_OPTIONS = [
  { id: 'PAYX_QR' as PaymentMethodId, group: 'Khuyến nghị', label: 'Quét QR PayX', description: 'Phí 0đ · 24/7', logoText: 'PayX' },
  { id: 'VNPAY_QR' as PaymentMethodId, group: 'Khuyến nghị', label: 'Quét QR VNPay', description: 'Phí 0đ', logoText: 'VNPay' },
  { id: 'NAPAS' as PaymentMethodId, group: 'Thẻ ngân hàng', label: 'Thẻ ATM nội địa', logoText: 'NAPAS' },
  { id: 'VISA_VNPAY' as PaymentMethodId, group: 'Thẻ ngân hàng', label: 'Thẻ tín dụng (VNPay)', logoText: 'Visa' },
  { id: 'ONEPAY_INTL' as PaymentMethodId, group: 'Thẻ ngân hàng', label: 'Thẻ quốc tế (OnePay)', logoText: 'OnePay' },
  { id: 'PAYOO_WALLET' as PaymentMethodId, group: 'Ví điện tử', label: 'Ví Payoo', logoText: 'Payoo' },
];

export default function CheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const { race_id, course_id } = useLocalSearchParams<{ race_id: string; course_id: string }>();
  const draft = useDraftPersist<AthleteForm>(`draft_checkout_${race_id}_${course_id}`, 24);

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selectedCourseId, setSelectedCourseId] = useState(course_id);
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
  const [discountApplied, setDiscountApplied] = useState<{ amount: number } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>('PAYX_QR');
  const [submitting, setSubmitting] = useState(false);

  // Mock race data — replace with sdk.race.get(race_id)
  const courses = [
    { id: 'c1', name: '5 km', distance: '5 km', price: 200_000, availableSlots: 50 },
    { id: 'c2', name: '10 km', distance: '10 km', price: 350_000 },
    { id: 'c3', name: '21 km', distance: '21 km', price: 500_000 },
  ];
  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? courses[0];

  // Restore draft on mount
  useEffect(() => {
    (async () => {
      const restored = await draft.restore();
      if (restored) {
        setForm(restored);
        toast.show({ variant: 'info', message: t('checkout.draftRestored') });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save draft (debounced 1s)
  useEffect(() => {
    if (step !== 1) return;
    const id = setTimeout(() => draft.save(form), 1000);
    return () => clearTimeout(id);
  }, [form, step, draft]);

  const total = Math.max(0, selectedCourse.price - (discountApplied?.amount ?? 0));
  const fmtVnd = (n: number) => n.toLocaleString('vi-VN') + 'đ';

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

  const applyDiscount = async () => {
    if (!discountCode.trim()) return;
    setDiscountError(null);
    try {
      // const r = await sdk.priceRule.findOne({ text: discountCode, raceId: race_id });
      await new Promise((r) => setTimeout(r, 400));
      if (discountCode.toUpperCase() === 'NHAPMA') {
        setDiscountApplied({ amount: 20_000 });
        toast.show({ variant: 'success', message: t('checkout.discountAppliedFmt', { amount: '20.000' }) });
      } else {
        setDiscountApplied(null);
        setDiscountError(t('checkout.discountInvalid'));
        toast.show({ variant: 'error', message: t('checkout.discountInvalid') });
      }
    } catch {
      setDiscountError(t('errors.generic'));
    }
  };

  const submitOrder = async () => {
    if (!paymentMethod) return;
    setSubmitting(true);
    try {
      // const order = await sdk.order.create({ raceId, courseId, athlete, discountCode });
      // const { url } = await sdk.payment.getUrl({ orderId: order.orderId, paymentMethod, returnUrl: 'bib5://payment-return' });
      const fakeOrderId = `ORD-${Date.now()}`;
      const fakeUrl = `https://sandbox.vnpayment.vn/pay?order=${fakeOrderId}`;
      await draft.clear();
      router.push({
        pathname: '/checkout/payment-webview',
        params: { orderId: fakeOrderId, url: fakeUrl, method: paymentMethod },
      });
    } catch {
      toast.show({ variant: 'error', message: t('errors.generic') });
    } finally {
      setSubmitting(false);
    }
  };

  const headerTitle =
    step === 0 ? t('checkout.step1Title') : step === 1 ? t('checkout.step2Title') : t('checkout.step3Title');
  const stepLabels = [t('checkout.step1Title'), t('checkout.step2Title'), t('checkout.step3Title')];

  return (
    <>
      <Header
        title={t('common.continue')}
        leading="back"
        onLeadingPress={() => (step === 0 ? router.back() : setStep((step - 1) as any))}
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
          <Card>
            <Text
              style={{
                fontSize: tokens.fontSize.h3,
                fontWeight: tokens.fontWeight.bold,
                color: tokens.color.neutral900,
              }}
            >
              Saigon Marathon 2026
            </Text>
            <Text style={{ marginTop: 4, color: tokens.color.neutral600 }}>📅 15/03/2026 · 📍 TP.HCM</Text>
          </Card>

          <FormSection title={t('checkout.selectedCourse')}>
            {courses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                selected={selectedCourseId === c.id}
                asRadio
                onPress={() => setSelectedCourseId(c.id)}
              />
            ))}
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
                {t('profile.gender')} *
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
          }
        >
          <Card>
            <Text style={{ fontWeight: tokens.fontWeight.semibold, color: tokens.color.neutral900 }}>
              Saigon Marathon 2026
            </Text>
            <Text style={{ color: tokens.color.neutral600 }}>
              {selectedCourse.distance} · {form.firstName} {form.lastName}
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
              <Button variant="outline" size="lg" disabled={!discountCode.trim()} onPress={applyDiscount}>
                {t('checkout.discountApply')}
              </Button>
            </View>
            {discountApplied && (
              <Text style={{ color: tokens.color.success, fontSize: tokens.fontSize.bodySm }}>
                ✓ {t('checkout.discountAppliedFmt', { amount: discountApplied.amount.toLocaleString('vi-VN') })}
              </Text>
            )}
          </FormSection>

          <SectionDivider />

          <FormSection title={t('checkout.paymentDetails')}>
            <Row label={t('checkout.subtotal')} value={fmtVnd(selectedCourse.price)} />
            {discountApplied && <Row label={t('checkout.discount')} value={`− ${fmtVnd(discountApplied.amount)}`} />}
            <View style={{ height: 1, backgroundColor: tokens.color.neutral200 }} />
            <Row label={t('checkout.total')} value={fmtVnd(total)} bold brand />
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

function Row({ label, value, bold, brand }: { label: string; value: string; bold?: boolean; brand?: boolean }) {
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
