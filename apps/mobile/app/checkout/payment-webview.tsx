/**
 * apps/mobile/app/checkout/payment-webview.tsx — S-CHECKOUT-05
 *
 * Loads gateway payment URL via SDK, opens in WebView, intercepts known
 * callback patterns per gateway and routes to /checkout/result.
 *
 * Spec: BR-CHECKOUT-12 (URL whitelist), BR-CHECKOUT-17 (cancel confirm),
 *       BR-CHECKOUT-19 (post-callback polling on result screen).
 *
 * ⚠️ VNPay callback is canonical (vnp_ResponseCode=00 → success).
 *    PayX/Payoo patterns are best-guess and fall through to a generic
 *    "returned to 5bib host" detector that hands off to result screen
 *    with status=unknown → result screen will poll order status.
 *    OnePay has no clean callback — when user closes/finishes, we call
 *    checkOnepayStatus(orderId) then route.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '../../src/components/Button';
import { useToast } from '../../src/components/Toast';
import { payment } from '../../src/sdk/services/payment';
import type { PaymentGateway } from '../../src/sdk/models';
import { tokens } from '../../src/theme/tokens';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let WebView: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ({ WebView } = require('react-native-webview'));
} catch {
  // optional dep — handled in render
}

// ---------------------------------------------------------------------------
// Gateway config
// ---------------------------------------------------------------------------

const GATEWAY_HOSTS: Record<PaymentGateway, string[]> = {
  vnpay: ['vnpayment.vn', 'sandbox.vnpayment.vn'],
  payx: ['payx.vn', 'payx.com.vn'],
  payoo: ['payoo.vn', 'payoo.com.vn'],
  onepay: ['onepay.vn', 'mtf.onepay.vn'],
};

const FIVE_BIB_HOSTS = ['5bib.com', 'api.5bib.com', 'dapi.5bib.com'];

const GATEWAY_LABEL: Record<PaymentGateway, string> = {
  vnpay: 'VNPay',
  payx: 'PayX',
  payoo: 'Payoo',
  onepay: 'OnePay',
};

type ResultStatus = 'success' | 'failed' | 'pending' | 'unknown';

interface NavState {
  url: string;
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

function safeParseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function hostMatches(hostname: string, allowedHosts: string[]): boolean {
  return allowedHosts.some(
    (d) => hostname === d || hostname.endsWith('.' + d),
  );
}

function isAllowedHost(rawUrl: string, gateway: PaymentGateway): boolean {
  const u = safeParseUrl(rawUrl);
  if (!u) return false;
  const allowed = [...GATEWAY_HOSTS[gateway], ...FIVE_BIB_HOSTS];
  return hostMatches(u.hostname, allowed);
}

function is5bibHost(rawUrl: string): boolean {
  const u = safeParseUrl(rawUrl);
  if (!u) return false;
  return hostMatches(u.hostname, FIVE_BIB_HOSTS);
}

/**
 * Detect callback completion + status. Returns null if URL is mid-flow.
 */
function detectCallback(
  rawUrl: string,
  gateway: PaymentGateway,
): ResultStatus | null {
  const u = safeParseUrl(rawUrl);
  if (!u) return null;
  const qp = u.searchParams;

  // VNPay — canonical
  if (qp.has('vnp_ResponseCode') || qp.has('vnp_TransactionStatus')) {
    const code = qp.get('vnp_ResponseCode');
    return code === '00' ? 'success' : 'failed';
  }

  // PayX — best-guess. Common patterns: status / errorCode / payment_status.
  if (gateway === 'payx') {
    const status = (qp.get('status') ?? qp.get('payment_status') ?? '').toLowerCase();
    const err = (qp.get('errorCode') ?? qp.get('error_code') ?? '').toUpperCase();
    if (status === 'success' || err === 'SUCCESS' || err === '00') return 'success';
    if (status === 'failed' || status === 'cancel' || (err && err !== 'SUCCESS' && err !== '00'))
      return 'failed';
  }

  // Payoo — best-guess. Docs typically use OrderStatus + Checksum.
  if (gateway === 'payoo') {
    const orderStatus = (qp.get('OrderStatus') ?? qp.get('order_status') ?? qp.get('status') ?? '').toLowerCase();
    if (orderStatus === '1' || orderStatus === 'success' || orderStatus === 'paid')
      return 'success';
    if (orderStatus === '0' || orderStatus === 'failed' || orderStatus === 'cancel')
      return 'failed';
  }

  // OnePay — best-guess for redirect form. vpc_TxnResponseCode=0 → success.
  if (gateway === 'onepay') {
    const code = qp.get('vpc_TxnResponseCode');
    if (code === '0') return 'success';
    if (code !== null) return 'failed';
  }

  // Generic fallback: returned to 5bib host means flow completed but we
  // don't know status — let result screen poll order.
  if (is5bibHost(rawUrl)) {
    return 'unknown';
  }

  return null;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PaymentWebviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const toast = useToast();

  const params = useLocalSearchParams<{
    order_id?: string;
    orderId?: string;
    gateway?: string;
    method?: string;
  }>();

  const orderId = String(params.order_id ?? params.orderId ?? '');
  const rawGateway = String(params.gateway ?? params.method ?? 'vnpay').toLowerCase();
  const gateway: PaymentGateway = (
    ['vnpay', 'payx', 'payoo', 'onepay'].includes(rawGateway) ? rawGateway : 'vnpay'
  ) as PaymentGateway;

  const [url, setUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webRef = useRef<any>(null);
  const handledRef = useRef(false);

  // -------------------------------------------------------------------------
  // Fetch payment URL on mount
  // -------------------------------------------------------------------------
  const loadUrl = useCallback(async () => {
    if (!orderId) {
      setError(t('errors.generic'));
      setLoadingUrl(false);
      return;
    }
    setLoadingUrl(true);
    setError(null);
    try {
      const fn = {
        vnpay: payment.getVnpayPaymentUrl,
        payx: payment.getPayxPaymentUrl,
        payoo: payment.getPayooPaymentUrl,
        onepay: payment.getOnepayPaymentUrl,
      }[gateway];
      const res = await fn(orderId);
      if (!res.url) {
        setError(t('payment.webview.error'));
      } else {
        setUrl(res.url);
      }
    } catch {
      setError(t('payment.webview.error'));
    } finally {
      setLoadingUrl(false);
    }
  }, [gateway, orderId, t]);

  useEffect(() => {
    loadUrl();
  }, [loadUrl]);

  // -------------------------------------------------------------------------
  // Navigation interceptor
  // -------------------------------------------------------------------------
  const routeToResult = useCallback(
    (status: ResultStatus) => {
      if (handledRef.current) return;
      handledRef.current = true;
      router.replace({
        pathname: '/checkout/result',
        params: { order_id: orderId, orderId, status },
      });
    },
    [orderId, router],
  );

  const handleNavChange = useCallback(
    (nav: NavState) => {
      if (handledRef.current) return;
      const next = nav.url ?? '';
      const status = detectCallback(next, gateway);
      if (status) {
        routeToResult(status);
      }
    },
    [gateway, routeToResult],
  );

  // OnePay: when finished w/o clean callback → poll status
  const finalizeOnepay = useCallback(async () => {
    if (handledRef.current) return;
    try {
      const { status } = await payment.checkOnepayStatus(orderId);
      const norm = status.toUpperCase();
      if (norm === 'SUCCESS' || norm === 'PAID') routeToResult('success');
      else if (norm === 'PENDING' || norm === 'PROCESSING') routeToResult('pending');
      else if (norm === 'FAILED' || norm === 'FAIL') routeToResult('failed');
      else routeToResult('unknown');
    } catch {
      routeToResult('unknown');
    }
  }, [orderId, routeToResult]);

  // -------------------------------------------------------------------------
  // shouldStartLoadWithRequest — whitelist + intercept
  // -------------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleShouldStart = useCallback(
    (req: { url?: string }) => {
      const next = req.url ?? '';
      // Callback intercept — block actual nav, route instead.
      const status = detectCallback(next, gateway);
      if (status) {
        routeToResult(status);
        return false;
      }
      // Whitelist enforcement
      if (!isAllowedHost(next, gateway)) {
        toast.show({
          variant: 'warning',
          message: t('payment.webview.externalBlocked'),
        });
        return false;
      }
      return true;
    },
    [gateway, routeToResult, t, toast],
  );

  // -------------------------------------------------------------------------
  // Back / close confirm
  // -------------------------------------------------------------------------
  const handleClose = useCallback(() => {
    if (gateway === 'onepay') {
      // OnePay: closing == finalize via status check
      Alert.alert(
        t('payment.webview.cancelConfirmTitle'),
        t('payment.webview.cancelConfirmMsg'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: () => {
              void finalizeOnepay();
            },
          },
        ],
      );
      return;
    }
    Alert.alert(
      t('payment.webview.cancelConfirmTitle'),
      t('payment.webview.cancelConfirmMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => router.back(),
        },
      ],
    );
  }, [finalizeOnepay, gateway, router, t]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const headerTitle = `${t('checkout.step3Title')} • ${GATEWAY_LABEL[gateway]}`;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tokens.color.surfaceBg,
        paddingTop: insets.top,
      }}
    >
      {/* Header */}
      <View
        style={{
          height: tokens.layout.headerHeight,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: tokens.space[2],
          borderBottomWidth: 1,
          borderBottomColor: tokens.color.neutral100,
        }}
      >
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          hitSlop={12}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 22, color: tokens.color.neutral900 }}>✕</Text>
        </Pressable>
        <Text
          style={{
            flex: 1,
            fontSize: tokens.fontSize.bodyMd,
            color: tokens.color.neutral900,
            fontWeight: tokens.fontWeight.semibold,
            textAlign: 'center',
          }}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {headerTitle}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Progress bar */}
      {url && !pageLoaded && (
        <View
          style={{
            height: 2,
            backgroundColor: tokens.color.neutral100,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: 2,
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: tokens.color.brandPrimary,
            }}
          />
        </View>
      )}

      {/* Body */}
      {loadingUrl && (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: tokens.space[3],
            padding: tokens.space[6],
          }}
        >
          <ActivityIndicator size="large" color={tokens.color.brandPrimary} />
          <Text style={{ color: tokens.color.neutral600 }}>
            {t('payment.webview.loading')}
          </Text>
        </View>
      )}

      {!loadingUrl && error && (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            gap: tokens.space[3],
            padding: tokens.space[6],
          }}
        >
          <Ionicons name="alert-circle-outline" size={48} color={tokens.color.warning} />
          <Text
            style={{
              fontSize: tokens.fontSize.h3,
              fontWeight: tokens.fontWeight.semibold,
              color: tokens.color.neutral900,
              textAlign: 'center',
            }}
          >
            {error}
          </Text>
          <View style={{ width: '100%', gap: tokens.space[2], marginTop: tokens.space[3] }}>
            <Button variant="primary" size="lg" fullWidth onPress={loadUrl}>
              {t('payment.webview.retry')}
            </Button>
            <Button variant="ghost" size="lg" fullWidth onPress={() => router.back()}>
              {t('common.back')}
            </Button>
          </View>
        </View>
      )}

      {!loadingUrl && !error && url && WebView && (
        <WebView
          ref={webRef}
          source={{ uri: url }}
          onShouldStartLoadWithRequest={handleShouldStart}
          onNavigationStateChange={handleNavChange}
          onLoadProgress={(e: { nativeEvent: { progress: number } }) =>
            setProgress(e?.nativeEvent?.progress ?? 0)
          }
          onLoadEnd={() => setPageLoaded(true)}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled={Platform.OS === 'ios'}
          style={{ flex: 1 }}
        />
      )}

      {!loadingUrl && !error && url && !WebView && (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: tokens.space[6],
          }}
        >
          <Text style={{ color: tokens.color.neutral600 }}>
            react-native-webview not installed.
          </Text>
        </View>
      )}
    </View>
  );
}
