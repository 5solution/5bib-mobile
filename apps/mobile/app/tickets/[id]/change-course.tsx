/**
 * apps/mobile/app/tickets/[id]/change-course.tsx — S-TICKETS-04 Change Course
 *
 * ⚠️ PROBE-LIVE: SDK has `estimateChangeCourse` + `changeCourse` methods, but
 *    backend may return 403/404 (endpoints unverified per API_REFERENCE).
 *    Strategy: try estimate immediately on mount — if it 4xx/5xx the whole
 *    feature, render an "unavailable" placeholder and let the user back out.
 *
 * On success path (web contract — selling-web payment-screen.tsx):
 *   - Step 0: list alternative courses → estimate per pick.
 *   - PUT /codes/change-course performs the change AND (when fee > 0)
 *     creates a delta-fee order server-side, returned as `data.id`.
 *   - Fee > 0 → user picks a gateway here, then we route to
 *     /checkout/payment-webview with that delta order id.
 *   - Fee ≤ 0 → change is complete after the PUT; back to ticket detail.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Header } from '../../../src/components/Header';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { Banner } from '../../../src/components/ErrorState';
import { FormLayout, FormSection } from '../../../src/components/FormLayout';
import { CourseCard } from '../../../src/components/domain/CourseCard';
import {
  PaymentMethodPicker,
  PICKER_TO_GATEWAY,
  PAYMENT_OPTIONS,
  filterPaymentOptions,
  type PaymentMethodId,
} from '../../../src/components/PaymentMethodPicker';
import { Spinner } from '../../../src/components/Skeleton';
import { useToast } from '../../../src/components/Toast';
import { tokens } from '../../../src/theme/tokens';
import { ticket as ticketSdk } from '../../../src/sdk/services/ticket';
import { raceCourse as raceCourseSdk } from '../../../src/sdk/services/race-course';
import { athlete as athleteSdk } from '../../../src/sdk/services/athlete';
import { FetcherError } from '../../../src/sdk/core';
import type {
  Athlete,
  EstimateChangeResponse,
  RaceCourse,
  Ticket,
} from '../../../src/sdk/models';

const fmtVnd = (n: number) =>
  (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('vi-VN') + 'đ';

/**
 * Mobile Athlete → wire payload for PUT /codes/change-course.
 *
 * Mirrors web's `AthleteProfile.formDataToPayloadOrder` (selling-web
 * src/services/athlete/local.ts): snake_case keys, `idpp` duplicated from
 * id_number, `name` recomposed. Fields mobile doesn't track (address,
 * blood_type, achievements, customize fields) are omitted — backend treats
 * them as optional; web also omits them when the profile lacks values.
 */
function buildAthletePayload(a: Athlete | null): Record<string, unknown> {
  if (!a) return {};
  const name =
    a.name ?? [a.firstName, a.lastName].filter(Boolean).join(' ').trim();
  return {
    email: a.email,
    name,
    first_name: a.firstName,
    last_name: a.lastName,
    contact_phone: a.contactPhone,
    id_number: a.idNumber,
    idpp: a.idNumber,
    nationality: a.nationality,
    city_province: a.cityProvince,
    gender: a.gender,
    dob: a.dob,
    racekit: a.racekit,
    sosPhone: a.sosPhone,
    sos_phone: a.sosPhone,
    club: a.club,
    name_on_bib: a.nameOnBib,
    medical_info: a.medicalInfo,
    current_medication: a.currentMedication,
  };
}

export default function ChangeCourseScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [otherCourses, setOtherCourses] = useState<RaceCourse[]>([]);
  const [loading, setLoading] = useState(true);
  /** `null` = still probing, `true/false` = backend probe result. */
  const [featureAvailable, setFeatureAvailable] = useState<boolean | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<EstimateChangeResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Paid-change support: the PUT payload carries the athlete's info (web
  // parity) and the user must pick a gateway before committing a fee > 0.
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(null);

  // Load ticket + sibling courses + probe live.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const tk = await ticketSdk.getTicketById(id);
        if (cancelled) return;
        setTicket(tk);

        // Athlete record — required for the change-course PUT payload.
        // Fail-soft: a NEW ticket may have no athlete yet; payload falls
        // back to {} which matches the old behaviour for free changes.
        if (tk.value) {
          try {
            const a = await athleteSdk.getAthleteByTicketCode(tk.value);
            if (!cancelled) setAthlete(a);
          } catch {
            // non-fatal
          }
        }

        // Sibling courses (exclude current).
        const raceId = tk.race?.id;
        if (raceId) {
          try {
            const list = await raceCourseSdk.listCoursesByRace(raceId);
            const others = list.filter((c) => c.id !== tk.basicInfo?.courseId);
            if (!cancelled) setOtherCourses(others);
          } catch {
            // not blocking — leave empty
          }
        }

        // Probe live: try estimate with first other course to see if endpoint exists.
        if (tk.basicInfo?.courseId) {
          // We use a no-op probe: if there's a sibling course, estimate against it
          // to detect endpoint availability. If no siblings, mark available
          // optimistically so screen still renders.
          if (otherCourses.length === 0) {
            setFeatureAvailable(true);
          }
        }
      } catch (e) {
        if (e instanceof FetcherError && e.status === 401) return;
        toast.show({ variant: 'error', message: t('tickets.loadFailed') });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Mark feature available the moment a successful estimate returns.
  // If first estimate call throws 403/404, mark unavailable.
  const pickCourse = useCallback(
    async (courseId: string) => {
      if (!ticket?.value) return;
      setSelected(courseId);
      setEstimate(null);
      setEstimating(true);
      try {
        const r = await ticketSdk.estimateChangeCourse({
          codeValue: ticket.value,
          toCourseId: courseId,
        });
        setEstimate(r);
        setFeatureAvailable(true);
      } catch (e) {
        if (e instanceof FetcherError && e.status === 401) return;
        if (e instanceof FetcherError && (e.status === 403 || e.status === 404)) {
          setFeatureAvailable(false);
          return;
        }
        toast.show({ variant: 'error', message: t('errors.generic') });
      } finally {
        setEstimating(false);
      }
    },
    [ticket?.value, t, toast],
  );

  const submit = useCallback(async () => {
    if (!selected || !estimate || !ticket?.value) return;
    const fee = estimate.changeCourseFee;
    // Paid change requires a gateway pick (mirrors web's PaymentScreen step).
    if (fee > 0 && !paymentMethod) {
      toast.show({ variant: 'warning', message: t('checkout.selectPaymentMethod') });
      return;
    }
    setSubmitting(true);
    try {
      // P0 fix (review 2026-06-11): the old paid path pushed the user into
      // the NORMAL checkout — which creates a brand-new full-price order for
      // the target course and never touches the existing ticket. The web
      // contract (payment-screen.tsx) is: PUT /codes/change-course performs
      // the change AND returns a delta-fee order id → pay THAT order.
      const { orderId } = await ticketSdk.changeCourse({
        codeValue: ticket.value,
        toCourseId: selected,
        payload: buildAthletePayload(athlete),
      });
      if (fee > 0) {
        if (!orderId) {
          // Backend didn't return the fee order — surface instead of guessing.
          toast.show({ variant: 'error', message: t('errors.generic') });
          return;
        }
        const gateway = PICKER_TO_GATEWAY[paymentMethod!];
        router.replace({
          pathname: '/checkout/payment-webview',
          params: { order_id: orderId, gateway },
        });
        return;
      }
      toast.show({ variant: 'success', message: t('tickets.changeCourseSuccess') });
      router.replace(`/tickets/${id}`);
    } catch (e) {
      if (e instanceof FetcherError && e.status === 401) return;
      if (e instanceof FetcherError && (e.status === 403 || e.status === 404)) {
        setFeatureAvailable(false);
        return;
      }
      toast.show({ variant: 'error', message: t('errors.generic') });
    } finally {
      setSubmitting(false);
    }
  }, [selected, estimate, ticket, athlete, paymentMethod, id, router, t, toast]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  if (loading) {
    return (
      <>
        <Header
          title={t('tickets.changeCourseTitle')}
          leading="back"
          onLeadingPress={() => router.back()}
        />
        <ScrollView contentContainerStyle={{ padding: tokens.space[4] }}>
          <Spinner />
        </ScrollView>
      </>
    );
  }

  if (featureAvailable === false) {
    return (
      <>
        <Header
          title={t('tickets.changeCourseTitle')}
          leading="back"
          onLeadingPress={() => router.back()}
        />
        <View style={{ padding: tokens.space[5], gap: tokens.space[4] }}>
          <Banner variant="warning" message={t('tickets.changeCourseUnavailable')} />
          <Button variant="outline" size="md" onPress={() => router.back()}>
            {t('common.back')}
          </Button>
        </View>
      </>
    );
  }

  const fee = estimate?.changeCourseFee ?? 0;
  const ctaLabel = !estimate
    ? t('tickets.confirmChange')
    : fee > 0
      ? t('checkout.payWithAmountFmt', { amount: fmtVnd(fee) })
      : fee < 0
        ? `${t('tickets.confirmChange')} (${t('tickets.willRefund', { amount: fmtVnd(-fee) })})`
        : `${t('tickets.confirmChange')} (${t('tickets.feeZero')})`;

  return (
    <>
      <Header
        title={t('tickets.changeCourseTitle')}
        leading="back"
        onLeadingPress={() => router.back()}
      />
      <FormLayout
        stickyBottom={
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!selected || !estimate || submitting || (fee > 0 && !paymentMethod)}
            loading={submitting}
            onPress={submit}
          >
            {ctaLabel}
          </Button>
        }
      >
        <FormSection title={t('tickets.currentTicket')}>
          <Card>
            <Text style={{ fontWeight: tokens.fontWeight.semibold }}>
              {ticket?.race?.title ?? ticket?.basicInfo?.raceName} ·{' '}
              {ticket?.basicInfo?.courseDistance}
            </Text>
            {!!(ticket?.bib ?? ticket?.basicInfo?.bib) && (
              <Text style={{ color: tokens.color.neutral600 }}>
                BIB {ticket?.bib ?? ticket?.basicInfo?.bib}
              </Text>
            )}
          </Card>
        </FormSection>

        {otherCourses.length === 0 ? (
          <Banner variant="info" message="Không có cự ly khác để đổi." />
        ) : (
          <FormSection title={t('tickets.selectNewCourse')}>
            {otherCourses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                selected={selected === c.id}
                asRadio
                onPress={() => pickCourse(c.id)}
              />
            ))}
          </FormSection>
        )}

        {estimating && (
          <View style={{ padding: tokens.space[4] }}>
            <Spinner />
          </View>
        )}

        {estimate && (
          <FormSection title={t('tickets.feeBreakdown')}>
            <Row label={t('tickets.newCourse')} value={fmtVnd(estimate.finalValue)} />
            <View style={{ height: 1, backgroundColor: tokens.color.neutral200 }} />
            <Row
              label={fee > 0 ? t('tickets.needToPay') : fee < 0 ? 'Sẽ hoàn lại' : 'Miễn phí'}
              value={fmtVnd(Math.abs(fee))}
              bold
              brand={fee >= 0}
              error={fee < 0}
            />
            {!!estimate.note && (
              <Text style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral500 }}>
                {estimate.note}
              </Text>
            )}
          </FormSection>
        )}

        {/* Gateway pick — only when the change costs money. Options filtered
           by the race's payment_options allow-list, same as checkout. */}
        {estimate && fee > 0 && (
          <FormSection title={t('checkout.paymentMethod')}>
            <PaymentMethodPicker
              options={filterPaymentOptions(PAYMENT_OPTIONS, ticket?.race?.paymentOptions)}
              value={paymentMethod}
              onChange={setPaymentMethod}
            />
          </FormSection>
        )}
      </FormLayout>
    </>
  );
}

function Row({
  label,
  value,
  bold,
  brand,
  error,
}: {
  label: string;
  value: string;
  bold?: boolean;
  brand?: boolean;
  error?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
      }}
    >
      <Text style={{ color: tokens.color.neutral700, fontSize: bold ? 16 : 14 }}>{label}</Text>
      <Text
        style={{
          color: error
            ? tokens.color.success
            : brand
              ? tokens.color.brandPrimary
              : tokens.color.neutral900,
          fontWeight: bold ? tokens.fontWeight.bold : tokens.fontWeight.medium,
          fontSize: bold ? 18 : 14,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
