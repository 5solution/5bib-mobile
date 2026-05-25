/**
 * apps/mobile/app/checkout/result.tsx — S-CHECKOUT-06
 *
 * Three states: success | pending (auto-poll) | failed.
 * Pending → polls /order/by-id every 10s for up to 15 min (BR-CHECKOUT-19).
 */

import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button';
import { Spinner } from '../../src/components/Skeleton';
import { useCountdown, usePolling } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';

type Status = 'success' | 'pending' | 'failed';

export default function CheckoutResultScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId, status: initialStatus } = useLocalSearchParams<{
    orderId: string;
    status: Status;
  }>();

  const [status, setStatus] = useState<Status>(initialStatus ?? 'pending');
  const cd = useCountdown(15 * 60, status === 'pending');

  usePolling(
    async () => {
      // const order = await sdk.order.getById(orderId);
      // if (order.financialStatus === 'paid') return order;
      return null;
    },
    {
      intervalMs: 10_000,
      timeoutMs: 15 * 60 * 1000,
      onResolve: () => setStatus('success'),
      onTimeout: () => setStatus('failed'),
    },
    status === 'pending',
  );

  const fmtTime = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tokens.color.surfaceBg,
        paddingTop: insets.top + tokens.space[8],
        paddingHorizontal: tokens.space[6],
        paddingBottom: insets.bottom + tokens.space[4],
      }}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.space[3] }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor:
              status === 'success'
                ? tokens.color.successBg
                : status === 'pending'
                ? tokens.color.warningBg
                : tokens.color.errorBg,
          }}
        >
          <Text style={{ fontSize: 48 }}>
            {status === 'success' ? '✓' : status === 'pending' ? '⏳' : '✕'}
          </Text>
        </View>

        <Text
          style={{
            fontSize: tokens.fontSize.h1,
            fontWeight: tokens.fontWeight.bold,
            color: tokens.color.neutral900,
            textAlign: 'center',
            marginTop: tokens.space[3],
          }}
          accessibilityRole="header"
        >
          {status === 'success'
            ? t('checkout.paymentSuccess')
            : status === 'pending'
            ? t('checkout.paymentPendingTitle')
            : t('checkout.paymentFailedTitle')}
        </Text>

        {status === 'pending' && (
          <>
            <Text
              style={{
                color: tokens.color.neutral600,
                textAlign: 'center',
                lineHeight: tokens.lineHeight.bodyMd,
                maxWidth: 320,
              }}
            >
              {t('checkout.paymentPendingDesc')}
            </Text>
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

        {status === 'success' && (
          <>
            <View style={{ alignItems: 'center', marginTop: tokens.space[4], gap: 4 }}>
              <Text style={{ color: tokens.color.neutral500, fontSize: tokens.fontSize.bodySm }}>
                {t('checkout.orderIdLabel')}
              </Text>
              <Text
                style={{
                  fontFamily: 'Menlo',
                  fontSize: tokens.fontSize.h3,
                  color: tokens.color.neutral900,
                  fontWeight: tokens.fontWeight.bold,
                }}
              >
                #{orderId}
              </Text>
            </View>
            <Text
              style={{
                color: tokens.color.neutral600,
                textAlign: 'center',
                marginTop: tokens.space[4],
              }}
            >
              {t('checkout.bibAssignedNote')}
            </Text>
          </>
        )}

        {status === 'failed' && (
          <Text style={{ color: tokens.color.neutral600, textAlign: 'center', maxWidth: 320 }}>
            {t('checkout.paymentFailedReason', { reason: 'Giao dịch bị từ chối bởi ngân hàng' })}
          </Text>
        )}
      </View>

      <View style={{ gap: tokens.space[2] }}>
        {status === 'success' && (
          <>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.replace(`/tickets/${orderId}`)}
            >
              {t('checkout.viewQrTicket')}
            </Button>
            <Button variant="ghost" size="lg" fullWidth onPress={() => router.replace('/(tabs)/home')}>
              {t('common.goHome')}
            </Button>
          </>
        )}
        {status === 'failed' && (
          <>
            <Button variant="primary" size="lg" fullWidth onPress={() => router.back()}>
              {t('checkout.tryAnotherMethod')}
            </Button>
            <Button variant="ghost" size="lg" fullWidth onPress={() => router.replace('/(tabs)/home')}>
              {t('common.goHome')}
            </Button>
          </>
        )}
        {status === 'pending' && (
          <Button variant="outline" size="lg" fullWidth onPress={() => router.replace('/(tabs)/home')}>
            {t('common.goHome')}
          </Button>
        )}
      </View>
    </View>
  );
}
