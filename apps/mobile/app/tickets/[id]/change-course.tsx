/**
 * apps/mobile/app/tickets/[id]/change-course.tsx — S-TICKETS-04
 *
 * Flow:
 *   - List alternative courses (exclude current)
 *   - On select → fire estimate API → show fee breakdown
 *   - Submit: fee > 0 → payment flow; fee ≤ 0 → direct PUT
 */

import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Header } from '../../../src/components/Header';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { FormLayout, FormSection } from '../../../src/components/FormLayout';
import { CourseCard } from '../../../src/components/domain/CourseCard';
import { Spinner } from '../../../src/components/Skeleton';
import { useToast } from '../../../src/components/Toast';
import { tokens } from '../../../src/theme/tokens';

const COURSES = [
  { id: 'c2', distance: '10 km', price: 350_000 },
  { id: 'c3', distance: '21 km', price: 500_000 },
];

interface Estimate {
  changeCourseFee: number;
  finalValue: number;
  note: string;
}

const fmtVnd = (n: number) =>
  (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('vi-VN') + 'đ';

export default function ChangeCourseScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [selected, setSelected] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickCourse = async (courseId: string) => {
    setSelected(courseId);
    setEstimate(null);
    setEstimating(true);
    try {
      // const r = await sdk.ticket.estimateChangeCourse({ codeValue, toCourseId: courseId });
      await new Promise((r) => setTimeout(r, 600));
      const newCourse = COURSES.find((c) => c.id === courseId);
      const fee = (newCourse?.price ?? 0) - 200_000;
      setEstimate({
        changeCourseFee: fee,
        finalValue: newCourse?.price ?? 0,
        note: 'Đổi cự ly cần BTC approve.',
      });
    } finally {
      setEstimating(false);
    }
  };

  const submit = async () => {
    if (!selected || !estimate) return;
    setSubmitting(true);
    try {
      if (estimate.changeCourseFee > 0) {
        // route through payment flow with delta amount
        // for brevity, navigate to checkout with adjusted params (real impl needs a "top-up order" endpoint)
        toast.show({ variant: 'info', message: 'Chuyển sang thanh toán...' });
        router.push(`/checkout?race_id=1&course_id=${selected}`);
        return;
      }
      // await sdk.ticket.commitChangeCourse({ codeValue, toCourseId: selected });
      await new Promise((r) => setTimeout(r, 800));
      toast.show({ variant: 'success', message: 'Đổi cự ly thành công' });
      router.replace(`/tickets/${id}`);
    } finally {
      setSubmitting(false);
    }
  };

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
              Saigon Marathon · 5 km
            </Text>
            <Text style={{ color: tokens.color.neutral600 }}>BIB A1234</Text>
            <Text style={{ color: tokens.color.neutral600 }}>200.000đ {t('tickets.currentlyPaid')}</Text>
          </Card>
        </FormSection>

        <FormSection title={t('tickets.selectNewCourse')}>
          {COURSES.map((c) => (
            <CourseCard
              key={c.id}
              course={c as any}
              selected={selected === c.id}
              asRadio
              onPress={() => pickCourse(c.id)}
            />
          ))}
        </FormSection>

        {estimating && (
          <View style={{ padding: tokens.space[4] }}>
            <Spinner />
          </View>
        )}

        {estimate && (
          <FormSection title={t('tickets.feeBreakdown')}>
            <Row label={t('tickets.newCourse')} value={fmtVnd(estimate.finalValue)} />
            <Row label={t('tickets.oldCourseRefund')} value={`− ${fmtVnd(200_000)}`} />
            <View style={{ height: 1, backgroundColor: tokens.color.neutral200 }} />
            <Row
              label={fee > 0 ? t('tickets.needToPay') : fee < 0 ? 'Sẽ hoàn lại' : 'Cần trả thêm'}
              value={fmtVnd(Math.abs(fee))}
              bold
              brand={fee >= 0}
              error={fee < 0}
            />
            <Text style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral500 }}>
              {estimate.note}
            </Text>
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
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: tokens.color.neutral700, fontSize: bold ? 16 : 14 }}>{label}</Text>
      <Text
        style={{
          color: error ? tokens.color.success : brand ? tokens.color.brandPrimary : tokens.color.neutral900,
          fontWeight: bold ? tokens.fontWeight.bold : tokens.fontWeight.medium,
          fontSize: bold ? 18 : 14,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
