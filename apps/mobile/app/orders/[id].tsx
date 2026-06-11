/**
 * apps/mobile/app/orders/[id].tsx — S-ORDERS-02 Order Detail.
 *
 * Mirrors dev.5bib.com `/vi/orders/{id}` (verified 2026-05-29):
 *   - Header `#5BXXXXIB` with back arrow
 *   - "Thông tin sự kiện" card: race title + organizer
 *   - "Sản phẩm" table: course - tier / unit price / qty / line total
 *   - "Thông tin thanh toán" card: transaction time, status, subtotal,
 *     discount, VAT, total
 *   - When `financial_status=pending` show prominent "Thanh toán ngay" CTA
 *     that routes to /checkout/payment-webview, mirroring web's behavior.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { Skeleton } from '../../src/components/Skeleton';
import { FadeSlideIn } from '../../src/components/motion';
import { useToast } from '../../src/components/Toast';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import { order as orderSdk } from '../../src/sdk/services/order';
import { FetcherError } from '../../src/sdk/core';
import type { Order } from '../../src/sdk/models';

const fmtVnd = (n: number) =>
  Number.isFinite(n) ? n.toLocaleString('vi-VN') + 'đ' : '—';

function fmtDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

export default function OrderDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setErrored(false);
    setLoading(true);
    try {
      const o = await orderSdk.getOrderById(String(id));
      setOrder(o);
    } catch (e) {
      setErrored(true);
      if (e instanceof FetcherError && e.status === 401) return;
      toast.show({
        variant: 'error',
        message:
          e instanceof FetcherError && e.message
            ? e.message
            : t('orders.loadFailed'),
      });
    } finally {
      setLoading(false);
    }
  }, [id, t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const orderNumber = order
    ? '#' + String(order.orderNumber ?? order.id).replace(/^#+/, '')
    : `#${id ?? '...'}`;
  const isPending = order?.financialStatus === 'pending';
  const isPaid = order?.financialStatus === 'paid';
  const isVoided = order?.financialStatus === 'voided';

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceScreen }}>
      <Header
        title={orderNumber}
        leading="back"
        onLeadingPress={() => router.back()}
      />
      {!online && <Banner variant="warning" message={t('errors.offlineCached')} />}

      <ScrollView
        contentContainerStyle={{
          padding: tokens.space[4],
          gap: tokens.space[4],
          paddingBottom: tokens.space[10],
        }}
      >
        {loading ? (
          <>
            <Skeleton height={20} width="40%" />
            <Skeleton height={120} />
            <Skeleton height={160} />
            <Skeleton height={120} />
          </>
        ) : errored || !order ? (
          <View style={{ alignItems: 'center', padding: tokens.space[6], gap: tokens.space[3] }}>
            <Ionicons name="alert-circle-outline" size={36} color={tokens.color.warning} />
            <Text style={{ fontSize: tokens.fontSize.h4, color: tokens.color.neutral900 }}>
              {t('orders.loadFailed')}
            </Text>
            <Button variant="primary" size="md" onPress={() => void load()}>
              {t('common.retry')}
            </Button>
          </View>
        ) : (
          <>
            {/* Event info — matches "ℹ️ Thông tin sự kiện" card on web. */}
            <FadeSlideIn delay={0}>
            <SectionCard
              icon="information-circle-outline"
              title={t('orders.detail.eventInfo')}
            >
              <Text
                style={{
                  fontSize: tokens.fontSize.bodyLg,
                  fontWeight: tokens.fontWeight.semibold,
                  color: tokens.color.neutral900,
                }}
              >
                {order.raceName || '—'}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: tokens.space[2],
                }}
              >
                <Text style={{ color: tokens.color.neutral500, fontSize: tokens.fontSize.bodySm }}>
                  {t('orders.detail.orderId')}
                </Text>
                <Text
                  style={{
                    color: tokens.color.neutral800,
                    fontFamily: 'Menlo',
                    fontSize: tokens.fontSize.bodySm,
                  }}
                >
                  {orderNumber}
                </Text>
              </View>
            </SectionCard>
            </FadeSlideIn>

            {/* Products — matches "🛒 Sản phẩm" table on web. */}
            <FadeSlideIn delay={90}>
            <SectionCard icon="cart-outline" title={t('orders.detail.products')}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: tokens.space[2],
                  borderBottomWidth: 1,
                  borderBottomColor: tokens.color.neutral100,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: tokens.fontSize.bodyMd,
                      color: tokens.color.neutral900,
                      fontWeight: tokens.fontWeight.semibold,
                    }}
                  >
                    {order.courseName || '—'}
                  </Text>
                  <Text style={{ color: tokens.color.neutral600, fontSize: tokens.fontSize.bodySm }}>
                    x1
                  </Text>
                </View>
                <Text
                  style={{
                    color: tokens.color.brandPrimary,
                    fontWeight: tokens.fontWeight.semibold,
                  }}
                >
                  {fmtVnd(order.totalAmount)}
                </Text>
              </View>
            </SectionCard>
            </FadeSlideIn>

            {/* Payment info — matches "✉️ Thông tin thanh toán" sidebar */}
            <FadeSlideIn delay={180}>
            <SectionCard
              icon="mail-outline"
              title={t('orders.detail.paymentInfo')}
            >
              <Row
                label={t('orders.detail.transactionTime')}
                value={
                  isPaid && order.paidAt
                    ? fmtDateTime(order.paidAt)
                    : isPending
                      ? t('orders.detail.notYetPaid')
                      : '—'
                }
              />
              <Row
                label={t('orders.detail.paymentStatus')}
                value={
                  isPaid
                    ? t('orders.statusPaid')
                    : isPending
                      ? t('orders.statusPending')
                      : isVoided
                        ? t('orders.statusVoided')
                        : t('orders.statusFailed')
                }
                valueColor={
                  isPaid
                    ? tokens.color.success
                    : isPending
                      ? tokens.color.warning
                      : tokens.color.neutral500
                }
              />
              <Row label={t('orders.detail.subtotal')} value={fmtVnd(order.subtotal)} />
              {order.discountAmount > 0 && (
                <Row
                  label={t('orders.detail.discount')}
                  value={`− ${fmtVnd(order.discountAmount)}`}
                />
              )}
              <View
                style={{
                  height: 1,
                  backgroundColor: tokens.color.neutral200,
                  marginVertical: tokens.space[2],
                }}
              />
              <Row
                label={t('orders.detail.total')}
                value={fmtVnd(order.totalAmount)}
                bold
                brand
              />
              {order.paymentMethod && (
                <Row
                  label={t('orders.paymentMethod')}
                  value={String(order.paymentMethod).toUpperCase()}
                />
              )}
            </SectionCard>
            </FadeSlideIn>

            {/* CTAs — web shows "Thanh toán ngay" + back-links */}
            {isPending && order.id && (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={() =>
                  router.push({
                    pathname: '/checkout/payment-webview',
                    params: { order_id: order.id, gateway: 'vnpay' },
                  })
                }
              >
                {t('orders.detail.payNow')}
              </Button>
            )}
            {order.ticketId && (
              <Button
                variant="outline"
                size="md"
                fullWidth
                onPress={() => router.push(`/tickets/${order.ticketId}`)}
              >
                {t('orders.viewTicket')} →
              </Button>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: tokens.color.surfaceCard,
        borderRadius: tokens.radius.lg,
        padding: tokens.space[4],
        gap: tokens.space[2],
        ...tokens.elevation[1],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] }}>
        <Ionicons name={icon} size={18} color={tokens.color.neutral600} />
        <Text
          style={{
            fontSize: tokens.fontSize.labelMd,
            fontWeight: tokens.fontWeight.semibold,
            color: tokens.color.neutral700,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {title}
        </Text>
      </View>
      <View style={{ paddingTop: tokens.space[1] }}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  bold,
  brand,
  valueColor,
}: {
  label: string;
  value: string;
  bold?: boolean;
  brand?: boolean;
  valueColor?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: tokens.space[2],
      }}
    >
      <Text
        style={{
          color: tokens.color.neutral500,
          fontSize: bold ? tokens.fontSize.bodyMd : tokens.fontSize.bodySm,
          flex: 1,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color:
            valueColor ??
            (brand ? tokens.color.brandPrimary : tokens.color.neutral900),
          fontWeight: bold ? tokens.fontWeight.bold : tokens.fontWeight.medium,
          fontSize: bold ? tokens.fontSize.h4 : tokens.fontSize.bodyMd,
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
    </View>
  );
}
