/**
 * apps/mobile/app/checkout/payment-webview.tsx — S-CHECKOUT-05
 */

import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebViewWrapper } from '../../src/components/WebViewWrapper';

const ALLOWED = [
  'vnpayment.vn',
  'payx.vn',
  'payx.com.vn',
  'payoo.vn',
  'payoo.com.vn',
  'onepay.vn',
  '5bib.com',
];

export default function PaymentWebviewScreen() {
  const router = useRouter();
  const { url, orderId, method } = useLocalSearchParams<{
    url: string;
    orderId: string;
    method: string;
  }>();

  return (
    <WebViewWrapper
      url={url}
      allowedDomains={ALLOWED}
      returnUrlPrefix="bib5://payment-return"
      title="Thanh toán"
      badge={method}
      idleTimeoutMs={10 * 60 * 1000}
      onReturn={(params) => {
        router.replace({
          pathname: '/checkout/result',
          params: { orderId: params.orderId ?? orderId, status: params.status ?? 'pending' },
        });
      }}
      onClose={() => router.back()}
    />
  );
}
