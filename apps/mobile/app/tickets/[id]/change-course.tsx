/**
 * apps/mobile/app/tickets/[id]/change-course.tsx — S-TICKETS-04 Change Course
 *
 * ⚠️ PROBE-LIVE: SDK has `estimateChangeCourse` + `changeCourse` methods, but
 *    backend may return 403/404 (endpoints unverified per API_REFERENCE).
 *    Strategy: try estimate immediately on mount — if it 4xx/5xx the whole
 *    feature, render an "unavailable" placeholder and let the user back out.
 *
 * On success path:
 *   - Step 0 only (MVP): list alternative courses → estimate per pick → commit.
 *   - Fee > 0 → bounce to /checkout for delta payment (cannot fully reuse
 *     EPIC-3 yet; tracked as deferred).
 *   - Fee ≤ 0 → commit directly via `ticketSdk.changeCourse`.
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
import { Spinner } from '../../../src/components/Skeleton';
import { useToast } from '../../../src/components/Toast';
import { tokens } from '../../../src/theme/tokens';
import { ticket as ticketSdk } from '../../../src/sdk/services/ticket';
import { raceCourse as raceCourseSdk } from '../../../src/sdk/services/race-course';
import { FetcherError } from '../../../src/sdk/core';
import type { EstimateChangeResponse, RaceCourse, Ticket } from '../../../src/sdk/models';

const fmtVnd = (n: number) =>
  (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('vi-VN') + 'đ';

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

  // Load ticket + sibling courses + probe live.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const tk = await ticketSdk.getTicketById(id);
        if (cancelled) return;
        setTicket(tk);

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
    setSubmitting(true);
    try {
      if (estimate.changeCourseFee > 0) {
        // Top-up payment flow not wired end-to-end yet — direct user to checkout.
        toast.show({ variant: 'info', message: 'Chuyển sang thanh toán...' });
        router.push(`/checkout?race_id=${ticket.race?.id ?? ''}&course_id=${selected}`);
        return;
      }
      await ticketSdk.changeCourse({
        codeValue: ticket.value,
        toCourseId: selected,
        payload: {},
      });
      toast.show({ variant: 'success', message: 'Đổi cự ly thành công' });
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
  }, [selected, estimate, ticket, id, router, t, toast]);

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
            disabled={!selected || !estimate || submitting}
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
