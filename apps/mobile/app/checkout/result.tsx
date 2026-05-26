/**
 * apps/mobile/app/checkout/result.tsx — S-CHECKOUT-06
 *
 * Three states: success | pending (auto-poll) | failed.
 * Pending → polls GET /order/by-id every 10s for up to 15 min (BR-CHECKOUT-19).
 * On poll resolve (financialStatus === 'paid') flips to success.
 * On timeout shows a banner + keeps manual refresh button.
 *
 * Failed flow: CTA → back to gateway picker. Cancel order CTA → DELETE /order
 * with confirm dialog.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { Banner } from '../../src/components/ErrorState';
import { Spinner } from '../../src/components/Skeleton';
import { useToast } from '../../src/components/Toast';
import { useCountdown, usePolling } from '../../src/hooks';
import { order as orderService } from '../../src/sdk/services/order';
import type { Order } from '../../src/sdk/models';
import { tokens } from '../../src/theme/tokens';

type DisplayStatus = 'success' | 'pending' | 'failed';

const POLL_INTERVAL_MS = 10_000;
const POLL_TIMEOUT_MS = 15 * 60_000;

function deriveDisplayStatus(
  initialStatusParam: string | undefined,
  order: Order | null,
): DisplayStatus {
  // Order data wins over the param once we have it.
  if (order) {
    if (order.financialStatus === 'paid') return 'success';
    if (order.financialStatus === 'failed' || order.financialStatus === 'voided')
      return 'failed';
    return 'pending';
  }
  if (initialStatusParam === 'success') return 'success';
  if (initialStatusParam === 'failed') return 'failed';
  return 'pending';
}

export default function CheckoutResultScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{
    order_id?: string;
    orderId?: string;
    status?: string;
  }>();
  const orderId = String(params.order_id ?? params.orderId ?? '');
  const initialStatus = params.status;

  const [order, setOrder] = useState<Order | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const display = deriveDisplayStatus(initialStatus, order);
  const isPending = display === 'pending';

  const cd = useCountdown(POLL_TIMEOUT_MS / 1000, isPending && !pollTimedOut);

  // -------------------------------------------------------------------------
  // Initial fetch
  // -------------------------------------------------------------------------
  const fetchOrder = useCallback(async (): Promise<Order | null> => {
    if (!orderId) return null;
    try {
      const o = await orderService.getOrderById(orderId);
      setOrder(o);
      return o;
    } catch {
      return null;
    }
  }, [orderId]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await fetchOrder();
      if (mounted) setLoadingInitial(false);
    })();
    return () => {
      mounted = false;
    };
  }, [fetchOrder]);

  // -------------------------------------------------------------------------
  // Polling while pending
  // -------------------------------------------------------------------------
  usePolling<Order>(
    async () => {
      if (!orderId) return null;
      try {
        const o = await orderService.getOrderById(orderId);
        // Resolve when terminal state reached (paid OR failed/voided).
        if (
          o.financialStatus === 'paid' ||
          o.financialStatus === 'failed' ||
          o.financialStatus === 'voided'
        ) {
          return o;
        }
        // Surface intermediate updates without stopping the poll.
        setOrder(o);
        return null;
      } catch {
        return null;
      }
    },
    {
      intervalMs: POLL_INTERVAL_MS,
      timeoutMs: POLL_TIMEOUT_MS,
      onResolve: (o) => setOrder(o),
      onTimeout: () => setPollTimedOut(true),
    },
    isPending && !pollTimedOut && !loadingInitial,
  );

  // -------------------------------------------------------------------------
  // Manual refresh
  // -------------------------------------------------------------------------
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const o = await fetchOrder();
    setRefreshing(false);
    if (o && o.financialStatus === 'paid') {
      toast.show({ variant: 'success', message: t('checkout.paymentSuccess') });
    }
  }, [fetchOrder, t, toast]);

  // -------------------------------------------------------------------------
  // Cancel order
  // -------------------------------------------------------------------------
  const handleCancelOrder = useCallback(() => {
    Alert.alert(
      t('payment.result.failed.cancelConfirmTitle'),
      t('payment.result.failed.cancelConfirmMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await orderService.cancelOrder(orderId);
              toast.show({
                variant: 'success',
                message: t('payment.result.failed.cancelSuccess'),
              });
              router.replace('/(tabs)/home');
            } catch {
              toast.show({ variant: 'error', message: t('errors.generic') });
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  }, [orderId, router, t, toast]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const fmtTime = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const fmtAmount = (n: number) => n.toLocaleString('vi-VN');

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tokens.color.surfaceBg,
        paddingTop: insets.top,
      }}
    >
      {pollTimedOut && (
        <Banner
          variant="warning"
          message={t('payment.result.pending.timeoutBanner')}
          actionLabel={t('common.retry')}
          onAction={handleRefresh}
        />
      )}

      <ScrollView
        contentContainerStyle={{
          paddingTop: tokens.space[6],
          paddingHorizontal: tokens.space[6],
          paddingBottom: insets.bottom + tokens.space[4],
          flexGrow: 1,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            gap: tokens.space[3],
            marginBottom: tokens.space[6],
          }}
        >
          {/* Status icon circle */}
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                display === 'success'
                  ? tokens.color.successBg
                  : display === 'pending'
                    ? tokens.color.warningBg
                    : tokens.color.errorBg,
            }}
          >
            <Text style={{ fontSize: 48 }}>
              {display === 'success' ? '✓' : display === 'pending' ? '⏳' : '✕'}
            </Text>
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: tokens.fontSize.h1,
              fontWeight: tokens.fontWeight.bold,
              color: tokens.color.neutral900,
              textAlign: 'center',
            }}
            accessibilityRole="header"
          >
            {display === 'success'
              ? t('payment.result.success.title')
              : display === 'pending'
                ? t('payment.result.pending.title')
                : t('payment.result.failed.title')}
          </Text>

          {/* Subtitle */}
          <Text
            style={{
              color: tokens.color.neutral600,
              textAlign: 'center',
              lineHeight: tokens.lineHeight.bodyMd,
              maxWidth: 320,
            }}
          >
            {display === 'success'
              ? t('payment.result.success.subtitle')
              : display === 'pending'
                ? t('payment.result.pending.subtitle')
                : t('payment.result.failed.subtitle')}
          </Text>

          {/* Pending: countdown + spinner */}
          {display === 'pending' && !pollTimedOut && (
            <>
              <Text
                style={{
                  color: tokens.color.warning,
                  fontSize: tokens.fontSize.h3,
                  fontWeight: tokens.fontWeight.semibold,
                  fontFamily: 'Menlo',
                  marginTop: tokens.space[2],
                }}
              >
                {t('checkout.remainingTime', { time: fmtTime(cd.seconds) })}
              </Text>
              <Spinner label={t('checkout.checking')} />
            </>
          )}
        </View>

        {/* Order summary card */}
        {order && (
          <Card padding={4} style={{ marginBottom: tokens.space[4] }}>
            <View style={{ gap: tokens.space[2] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: tokens.color.neutral500, fontSize: tokens.fontSize.bodySm }}>
                  {t('checkout.orderIdLabel')}
                </Text>
                <Text
                  style={{
                    fontFamily: 'Menlo',
                    color: tokens.color.neutral900,
                    fontWeight: tokens.fontWeight.semibold,
                  }}
                >
                  #{order.orderNumber || order.id}
                </Text>
              </View>
              {order.raceName && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: tokens.color.neutral500, fontSize: tokens.fontSize.bodySm }}>
                    {t('checkout.selectedCourse')}
                  </Text>
                  <Text
                    style={{
                      color: tokens.color.neutral900,
                      flexShrink: 1,
                      textAlign: 'right',
                      marginLeft: tokens.space[2],
                    }}
                    numberOfLines={2}
                  >
                    {order.raceName}
                    {order.courseName ? ` • ${order.courseName}` : ''}
                  </Text>
                </View>
              )}
              {order.athleteName && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: tokens.color.neutral500, fontSize: tokens.fontSize.bodySm }}>
                    {t('checkout.personalInfo')}
                  </Text>
                  <Text style={{ color: tokens.color.neutral900 }}>{order.athleteName}</Text>
                </View>
              )}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  borderTopWidth: 1,
                  borderTopColor: tokens.color.neutral100,
                  paddingTop: tokens.space[2],
                  marginTop: tokens.space[1],
                }}
              >
                <Text
                  style={{
                    color: tokens.color.neutral700,
                    fontWeight: tokens.fontWeight.semibold,
                  }}
                >
                  {t('checkout.totalPaidLabel')}
                </Text>
                <Text
                  style={{
                    color: tokens.color.neutral900,
                    fontWeight: tokens.fontWeight.bold,
                    fontFamily: 'Menlo',
                  }}
                >
                  {fmtAmount(order.totalAmount)}
                  {t('common.currencyVnd')}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {display === 'success' && (
          <Text
            style={{
              color: tokens.color.neutral600,
              textAlign: 'center',
              marginTop: tokens.space[2],
            }}
          >
            {t('checkout.bibAssignedNote')}
          </Text>
        )}
      </ScrollView>

      {/* CTAs */}
      <View
        style={{
          gap: tokens.space[2],
          paddingHorizontal: tokens.space[6],
          paddingBottom: insets.bottom + tokens.space[4],
          paddingTop: tokens.space[2],
          borderTopWidth: 1,
          borderTopColor: tokens.color.neutral100,
        }}
      >
        {display === 'success' && (
          <>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => {
                const ticketId = order?.ticketId ?? orderId;
                router.replace(`/tickets/${ticketId}`);
              }}
            >
              {t('payment.result.success.viewTicket')}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              onPress={() => router.replace('/(tabs)/home')}
            >
              {t('common.goHome')}
            </Button>
          </>
        )}

        {display === 'pending' && (
          <>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={refreshing}
              onPress={handleRefresh}
            >
              {t('payment.result.pending.refresh')}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              onPress={() => router.replace('/(tabs)/home')}
            >
              {t('common.goHome')}
            </Button>
          </>
        )}

        {display === 'failed' && (
          <>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.back()}
            >
              {t('payment.result.failed.retry')}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              loading={cancelling}
              onPress={handleCancelOrder}
            >
              {t('payment.result.failed.cancel')}
            </Button>
          </>
        )}
      </View>

      {loadingInitial && !order && (
        <View
          style={{
            position: 'absolute',
            top: insets.top,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tokens.color.surfaceBg,
          }}
          pointerEvents="none"
        >
          <Spinner size="large" label={t('common.loading')} />
        </View>
      )}
    </View>
  );
}
