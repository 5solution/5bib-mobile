/**
 * apps/mobile/app/checkout/index.tsx — Checkout flow
 *
 * Single screen orchestrates S-CHECKOUT-01/02/03 in 3 steps via local state.
 * Auto-saves draft to AsyncStorage with TTL 24h (BR-CHECKOUT-16).
 *
 * Wires real SDK calls (race-course list, price-rule validate, order.createOrder)
 * and navigates to /checkout/payment-webview after successful order creation.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  PICKER_TO_GATEWAY,
  PAYMENT_OPTIONS,
  filterPaymentOptions,
} from '../../src/components/PaymentMethodPicker';
import { FormLayout, FormSection, SectionDivider } from '../../src/components/FormLayout';
import { DateField } from '../../src/components/DateField';
import { ChipSelect } from '../../src/components/ChipSelect';
import { useToast } from '../../src/components/Toast';
import { useOnline, useDraftPersist } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import { raceCourse, priceRule, order, race as raceSdk } from '../../src/sdk';
import type { Race, RaceCourse, OrderCreateInput } from '../../src/sdk/models';
import {
  DEFAULT_TSHIRT_SIZES,
  GUARDIAN_RELATIONS,
} from '../../src/sdk/constants/athlete';
import { calcAgeAt, localTodayIso } from '../../src/sdk/validations/checkout';
import { useCheckoutStore } from '../../src/stores/useCheckoutStore';
import { resolveSaleState } from '../../src/utils/sale-state';
import { isProductionApi } from '../../src/adapters/sdk-init';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// VN mobile phone — accepts:
//   - "0901234567" (legacy local format)
//   - "+84901234567" (E.164)
//   - "901234567"   (bare 9 digits — the UI shows a static "+84" prefix label
//                    next to the input, so users naturally type without
//                    a prefix; we accept that and prepend +84 at send-time)
const VN_PHONE_RX = /^(0|\+84)?[35789][0-9]{8}$/;
/** Normalize a VN phone input to a backend-friendly format with explicit
 *  country code. Returns the original string if it can't be normalized. */
function normalizePhone(raw: string): string {
  const s = raw.trim();
  if (s.startsWith('+84')) return s;
  if (s.startsWith('0')) return '+84' + s.slice(1);
  if (/^[35789][0-9]{8}$/.test(s)) return '+84' + s;
  return s;
}

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
  // Guardian (người giám hộ) — required when the athlete is under 18 at
  // registration time (web parity: useAthleteField condition age < 18).
  guardianName: string;
  guardianDob: string; // YYYY-MM-DD
  guardianIdentity: string;
  guardianEmail: string;
  guardianPhone: string;
  guardianRelation: string;
}

/** Map UI picker id → backend payment gateway (URL path slug). */
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
  // Backend-configured payment method allow-list. Loaded async after race
  // detail fetch; undefined = unknown/loading = show all options.
  const [raceDetail, setRaceDetail] = useState<Race | null>(null);
  const [allowedPayments, setAllowedPayments] = useState<string[] | undefined>(
    undefined,
  );
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
    guardianName: '',
    guardianDob: '',
    guardianIdentity: '',
    guardianEmail: '',
    guardianPhone: '',
    guardianRelation: '',
  });

  const [discountCode, setDiscountCode] = useState('');
  const [discountValidating, setDiscountValidating] = useState(false);
  const [discountApplied, setDiscountApplied] = useState<{ amount: number; code: string } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>('VNPAY_QR');
  const [includeInsurance, setIncludeInsurance] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  // React state is async — checking `submitting` from inside onPress can read
  // a stale value if a double-tap fires both handlers in the same tick. Use a
  // ref as the synchronous lock so the second tap is a no-op even before
  // setSubmitting(true) has flushed. Verified 2026-05-28 — simulator was
  // firing /order/create 2-3× per Fake-payment tap before this guard.
  const submitLock = useRef(false);

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

  // Load race detail in parallel — payment_options allow-list + shirt-size
  // config + event date (guardian adult check). Soft-fail leaves
  // allowedPayments=undefined → show all options, sizes → default list.
  useEffect(() => {
    if (!raceId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await raceSdk.getRaceById(raceId);
        if (cancelled) return;
        setRaceDetail(r);
        setAllowedPayments(r.paymentOptions);
      } catch {
        // ignore — fall back to default options
      }
    })();
    return () => {
      cancelled = true;
    };
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
        // Auto-select course + first PURCHASABLE ticket_type if user arrived
        // without specifying them via query params — or with params that
        // don't belong to THIS race (stale state when the screen is re-used
        // across deep links). Blindly taking ticketTypes[0] could pre-select
        // a tier that isn't on sale (F5).
        if (list.length > 0) {
          const initialCourse =
            list.find((c) => c.id === selectedCourseId) ?? list[0]!;
          if (!list.some((c) => c.id === selectedCourseId)) {
            setSelectedCourseId(initialCourse.id);
          }
          const ttKnown = (initialCourse.ticketTypes ?? []).some(
            (tt) => tt.id === selectedTicketTypeId,
          );
          if (!ttKnown && initialCourse.ticketTypes?.length) {
            const visible = initialCourse.ticketTypes.filter(
              (tt) => tt.isShow !== false,
            );
            const firstOpen = visible.find(
              (tt) =>
                resolveSaleState(tt.validFrom, tt.validTo) === 'open' &&
                (tt.remainedTicket == null || tt.remainedTicket > 0),
            );
            // No purchasable tier → select NOTHING. Falling back to a gated
            // tier rendered a contradictory selected-but-disabled card the
            // user couldn't even deselect (CourseCard kills onPress when
            // gated). Empty selection blocks Continue just the same.
            setSelectedTicketTypeId(firstOpen?.id ?? '');
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
        // MERGE over current defaults — a draft persisted by an older app
        // version lacks newer AthleteForm keys (e.g. the guardian fields);
        // a wholesale setForm(restored) would leave them undefined and
        // validateAthlete()'s .trim() calls would crash the render.
        setForm((prev) => ({ ...prev, ...restored }));
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

  // F5 — step-1 must not let a non-purchasable tier through: outside its
  // valid_from/valid_to window, out of stock, or admin-hidden (web parity:
  // gated tiers get a badge instead of a quantity stepper and never enter
  // the cart). Plain function (not just a memo) so submitOrder can re-check
  // with a FRESH clock right before createOrder — the sale window can close
  // while the user fills the 3-step form (TOCTOU; backend accepts closed-
  // phase orders, client gate is the only enforcement).
  // NOTE: hooks here must stay ABOVE the early returns below — hooks order.
  const computeSelectionBlocked = useCallback(() => {
    const c = (courses ?? []).find((x) => x.id === selectedCourseId);
    if (!c) return true;
    const visible = (c.ticketTypes ?? []).filter((tt) => tt.isShow !== false);
    const tt = visible.find((x) => x.id === selectedTicketTypeId);
    // Fail open ONLY for true legacy courses with no ticket_type rows at
    // all. Rows-exist-but-none-selected (incl. ALL tiers hidden) = blocked —
    // otherwise an admin-hidden tier could still be ordered via the
    // unfiltered variantId fallback.
    if (!tt) return (c.ticketTypes?.length ?? 0) > 0;
    const noStock = tt.remainedTicket != null && tt.remainedTicket <= 0;
    return resolveSaleState(tt.validFrom, tt.validTo) !== 'open' || noStock;
  }, [courses, selectedCourseId, selectedTicketTypeId]);
  // Re-evaluate every 30s while picking — resolveSaleState reads the clock,
  // so without a tick a tier opening/closing while the user sits on step 0
  // would never update the gate (flash-sale openings are exactly this case).
  const [saleClock, setSaleClock] = useState(0);
  useEffect(() => {
    if (step !== 0) return;
    const id = setInterval(() => setSaleClock((c) => c + 1), 30_000);
    return () => clearInterval(id);
  }, [step]);
  const selectionBlocked = useMemo(
    () => computeSelectionBlocked(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [computeSelectionBlocked, saleClock],
  );

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
  // Fallbacks below must skip admin-hidden tiers — pricing/ordering against
  // an is_show=false tier was possible when every tier of a course was
  // hidden (review finding 2026-06-11).
  const firstVisibleTier = (activeCourse.ticketTypes ?? []).filter(
    (tt) => tt.isShow !== false,
  )[0];
  // Prefer the selected ticket_type's price (per-tier) over the course's
  // headline price — same precedence as `subtotalEarly` above. Without this,
  // multi-tier races would compute subtotal from ticketTypes[0] even when
  // the user picked a different tier, and total would be wrong (or 0).
  const subtotal =
    selectedTicketType?.price ??
    firstVisibleTier?.price ??
    activeCourse.price;
  const insuranceFee = includeInsurance ? 0 : 0; // Fee TBD by backend; UI flag only for now.
  const total = Math.max(0, subtotal + insuranceFee - (discountApplied?.amount ?? 0));

  // Web parity (useAthleteField): guardian section appears when the athlete
  // is under 18 TODAY (dayjs().diff(dob,'year') < 18) — local calendar date.
  const todayIso = localTodayIso();
  const guardianRequired = !!form.dob && calcAgeAt(form.dob, todayIso) < 18;
  // Guardian must be an adult by event day (existing getGuardianSchema rule).
  const guardianIsAdult =
    !!form.guardianDob &&
    calcAgeAt(form.guardianDob, raceDetail?.startDate || todayIso) >= 18;

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
    if (guardianRequired) {
      if (form.guardianName.trim().length < 1) return false;
      if (!guardianIsAdult) return false;
      if (form.guardianIdentity.trim().length < 6) return false;
      if (!EMAIL_RX.test(form.guardianEmail.trim())) return false;
      if (!VN_PHONE_RX.test(form.guardianPhone)) return false;
      if (!form.guardianRelation) return false;
    }
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
    // ticketTypeId tells backend WHICH tier (Family/ELB/VIP) the user bought.
    // variantId is the legacy product-variant id backend's `line_items[].variant_id`
    // requires — sourced from the selected ticket_type. Falls back to course's
    // first ticket_type when user didn't actively pick a tier (single-tier flow).
    ...(selectedTicketTypeId ? { ticketTypeId: selectedTicketTypeId } : {}),
    ...(selectedTicketType?.variantId
      ? { variantId: selectedTicketType.variantId }
      : firstVisibleTier?.variantId
        ? { variantId: firstVisibleTier.variantId }
        : {}),
    athlete: {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      // Normalize so backend always sees +84 prefix regardless of what
      // shape the user typed (UI shows static "+84" label so people omit it).
      phone: normalizePhone(form.phone),
      dob: form.dob,
      gender: (form.gender || 'other') as 'male' | 'female' | 'other',
      nationality: form.nationality,
      idNumber: form.idNumber,
      tshirtSize: form.tshirtSize,
      // Backend's real size field is `racekit` — single UI input feeds both.
      racekit: form.tshirtSize,
      nameOnBib: form.nameOnBib,
      emergencyContactName: form.emergencyContactName,
      emergencyContactPhone: normalizePhone(form.emergencyContactPhone),
    },
    ...(guardianRequired
      ? {
          guardian: {
            name: form.guardianName.trim(),
            dob: form.guardianDob,
            identity: form.guardianIdentity.trim(),
            email: form.guardianEmail.trim(),
            phone: normalizePhone(form.guardianPhone),
            relation: form.guardianRelation,
          },
        }
      : {}),
    ...(discountApplied ? { discountCode: discountApplied.code } : {}),
    includedInsurance: includeInsurance,
  });

  const submitOrder = async () => {
    // Debounce: ignore re-tap while in-flight (BR-CHECKOUT — backend has no idempotency key).
    if (submitLock.current) return;
    if (!paymentMethod) return;
    if (!online) {
      toast.show({ variant: 'error', message: t('errors.network') });
      return;
    }
    // Belt-and-braces: re-check the sale window with a fresh clock — the
    // tier may have closed/sold out while the user filled the form, and the
    // backend would accept the order anyway (event-detail has the same guard).
    if (computeSelectionBlocked()) {
      toast.show({
        variant: 'warning',
        message: t('checkout.tierNoLongerAvailable'),
      });
      setStep(0);
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    try {
      const input = buildOrderInput();
      const created = await order.createOrder(input);
      await draft.clear();
      // Zero-total order (100%-off voucher / free add-on math): the BE
      // answers /​{gateway}/payment with HTTP 266 ORDER_WITH_TOTAL_EQUAL_ZERO
      // and NO gateway URL — web routes straight to the order page (api/
      // checkout route.ts, status 266 branch). The mobile Fetcher swallows
      // HTTP status codes, so the webview would dead-end on a retry loop.
      // Skip the gateway entirely; the result screen polls the order and
      // shows its real state.
      if (total <= 0) {
        router.replace({
          pathname: '/checkout/result',
          params: {
            order_id: created.orderId,
            orderId: created.orderId,
            status: 'unknown',
          },
        });
        return;
      }
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
      submitLock.current = false;
    }
  };

  // DEV-only: bypass real gateway, mark order paid via fake-payment endpoint.
  const submitFakePayment = async () => {
    if (submitLock.current) return;
    if (computeSelectionBlocked()) {
      toast.show({
        variant: 'warning',
        message: t('checkout.tierNoLongerAvailable'),
      });
      setStep(0);
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    try {
      const input = buildOrderInput();
      const created = await order.createOrder(input);
      // ⚠️ Use the SERVER's order total, not the client-computed one — found
      // live in E2E 2026-06-11: backend created the order at 925.056đ while
      // the UI math said 934.400đ ("Amount must be 925.056" → fake payment
      // failed silently 3× and left zombie pending orders). The client/server
      // total drift itself is tracked as a separate finding.
      await order.fakePayment(
        created.orderId,
        created.totalAmount || total,
        input.athlete.email,
      );
      await draft.clear();
      router.push({
        pathname: '/checkout/result',
        params: { order_id: created.orderId, status: 'paid' },
      });
    } catch (err) {
      // Surface backend's response body, not the generic axios message.
      // FetcherError attaches `status` + `response` so we can show the real
      // server error to the user instead of a generic "Could not create order".
      const e = err as { status?: number; response?: unknown; message?: string };
      let msg = e?.message ?? t('checkout.errors.createOrderFailed');
      try {
        const r = e.response;
        if (r && typeof r === 'object') {
          const errObj = (r as Record<string, unknown>).error as
            | Record<string, unknown>
            | undefined;
          if (errObj?.message) msg = String(errObj.message);
        }
      } catch {
        /* ignore */
      }
      toast.show({ variant: 'error', message: msg.slice(0, 140) });
    } finally {
      setSubmitting(false);
      submitLock.current = false;
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
            <View style={{ gap: tokens.space[2] }}>
              {selectionBlocked && (
                <Text
                  style={{
                    fontSize: tokens.fontSize.bodySm,
                    color: tokens.color.neutral600,
                    textAlign: 'center',
                  }}
                >
                  {t('checkout.selectionBlockedHint')}
                </Text>
              )}
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={!selectedCourseId || selectionBlocked}
                onPress={() => {
                  if (selectionBlocked) return;
                  setStep(1);
                }}
              >
                {t('common.continue')}
              </Button>
            </View>
          }
        >
          <FormSection title={t('checkout.selectedCourse')}>
            {/* Flatten course × ticket_type. Main label = course.name (web
               parity — "12KM"/"Family"; organizers type a bare number into
               `distance`), tier badge = ticket_type.type_name ("Early Bird"/
               "Regular"/"ELB"). CourseCard dedups badge vs label. */}
            {courses.flatMap((c) => {
              // F5: hidden tiers (is_show=false) never render; tiers outside
              // their sale window render disabled with "Chưa mở"/"Đã đóng"
              // badges via CourseCard.saleState — same gating as event detail.
              const tts = (c.ticketTypes ?? []).filter(
                (tt) => tt.isShow !== false,
              );
              if (tts.length > 1) {
                return tts.map((tt) => (
                  <CourseCard
                    key={`${c.id}:${tt.id}`}
                    course={{
                      id: `${c.id}:${tt.id}`,
                      name: c.name || undefined,
                      distance: c.distance || c.name,
                      tierName: tt.typeName || undefined,
                      price: tt.price,
                      availableSlots: tt.remainedTicket ?? undefined,
                      saleState: resolveSaleState(tt.validFrom, tt.validTo),
                      saleOpenAt: tt.validFrom,
                      saleCloseAt: tt.validTo,
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
              return [
                <CourseCard
                  key={tt ? `${c.id}:${tt.id}` : c.id}
                  course={{
                    id: tt ? `${c.id}:${tt.id}` : c.id,
                    name: c.name || undefined,
                    distance: c.distance || c.name,
                    tierName: tt?.typeName || undefined,
                    price: tt?.price ?? c.price,
                    availableSlots:
                      tt?.remainedTicket ?? c.availableSlots ?? undefined,
                    saleState: tt
                      ? resolveSaleState(tt.validFrom, tt.validTo)
                      : undefined,
                    saleOpenAt: tt?.validFrom,
                    saleCloseAt: tt?.validTo,
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
            <DateField
              label={t('profile.dob')}
              required
              value={form.dob}
              onChange={(iso) => setForm({ ...form, dob: iso })}
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

          <FormSection title={t('checkout.apparelSection')}>
            {/* Single size field — backend stores the shirt size in `racekit`
               (`tshirt_size` is a dead column, verified live 2026-06-11).
               Options come from the race's t_shirt_sizes config (web parity);
               default list when the organizer left it empty (race 257). */}
            <ChipSelect
              label={t('checkout.tshirtSize')}
              required
              options={
                raceDetail?.tshirtSizes?.length
                  ? raceDetail.tshirtSizes
                  : DEFAULT_TSHIRT_SIZES
              }
              value={form.tshirtSize}
              onChange={(v) => setForm({ ...form, tshirtSize: v })}
            />
            {!!raceDetail?.tshirtSizeTableUrl && (
              <Button
                variant="ghost"
                size="sm"
                onPress={() =>
                  router.push({
                    pathname: '/result/webview',
                    params: { url: raceDetail.tshirtSizeTableUrl! },
                  })
                }
              >
                {t('checkout.sizeTable')}
              </Button>
            )}
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

          {/* Guardian — required for under-18 athletes (web parity:
             useAthleteField shows the section when age < 18; payload nests
             athlete_represent inside athlete_sub_info). */}
          {guardianRequired && (
            <FormSection title={t('checkout.guardian.section')}>
              <Banner variant="info" message={t('checkout.guardian.hint')} />
              <Input
                label={t('checkout.guardian.name')}
                required
                value={form.guardianName}
                onChangeText={(v) => setForm({ ...form, guardianName: v })}
              />
              <DateField
                label={t('checkout.guardian.dob')}
                required
                value={form.guardianDob}
                onChange={(v) => setForm({ ...form, guardianDob: v })}
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
                onChangeText={(v) => setForm({ ...form, guardianIdentity: v })}
              />
              <Input
                label={t('checkout.guardian.email')}
                required
                variant="email"
                value={form.guardianEmail}
                onChangeText={(v) => setForm({ ...form, guardianEmail: v })}
              />
              <Input
                label={t('checkout.guardian.phone')}
                required
                variant="phone"
                value={form.guardianPhone}
                onChangeText={(v) => setForm({ ...form, guardianPhone: v })}
              />
              <ChipSelect
                label={t('checkout.guardian.relation')}
                required
                options={GUARDIAN_RELATIONS}
                value={form.guardianRelation}
                onChange={(v) => setForm({ ...form, guardianRelation: v })}
              />
            </FormSection>
          )}

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
              {/* Host-gated on top of __DEV__: a dev client pointed at
                 api.5bib.com must NOT offer fake payment (real orders). */}
              {__DEV__ && !isProductionApi() && (
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
            {/* Tier + athlete (web order-summary: "Early Bird - 12KM").
               `distance` here was the same bare organizer number ("12"). */}
            <Text style={{ color: tokens.color.neutral600 }}>
              {[selectedTicketType?.typeName, `${form.firstName} ${form.lastName}`.trim()]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Card>

          {/* F7: gateway picker FIRST (web parity — PaymentMethodSelector
             sits at the top of the right rail, before the cart). It used to
             be the last section, below the fold, so users could pay without
             ever seeing which method was preselected. */}
          <FormSection title={t('checkout.selectPaymentMethod')}>
            <PaymentMethodPicker
              options={filterPaymentOptions(PAYMENT_OPTIONS, allowedPayments)}
              value={paymentMethod}
              onChange={setPaymentMethod}
            />
          </FormSection>

          <SectionDivider />

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
