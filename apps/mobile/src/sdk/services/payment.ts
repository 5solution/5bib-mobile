/**
 * apps/mobile/src/sdk/services/payment.ts
 *
 * Payment gateway URL builder + status check.
 * Returns redirect URL → mobile opens in WebView.
 *
 * Source: docs/API_REFERENCE.md "EPIC-3 Checkout (Order + Payment)"
 *         payment gateway URLs section.
 *
 * Mobile WebView flow:
 *   1. Call `get{Gateway}PaymentUrl(orderId)` → get redirect URL
 *   2. Open WebView with URL
 *   3. User completes payment → gateway redirects to HTTPS callback
 *   4. Mobile intercepts callback URL pattern → close WebView
 *   5. Poll `order.getOrderById(orderId)` for `financialStatus === 'paid'`
 *
 * ⚠️ No custom URL scheme — backend only emits HTTPS callbacks.
 * ⚠️ OnePay has a separate `/onepay/check` poll endpoint.
 */
import { network } from '../core';
import type { PaymentGateway } from '../models';

/** Unwrap the various URL response envelopes backend uses. */
function pickUrl(data: { url?: string } | string | undefined): string {
  if (typeof data === 'string') return data;
  return data?.url ?? '';
}

async function getPaymentUrl(
  gateway: PaymentGateway,
  orderId: string,
  returnUrl?: string,
): Promise<{ url: string }> {
  const raw = await network().get<{ data: { url?: string } | string }>(
    `/${gateway}/payment`,
    {
      params: {
        order_id: orderId,
        ...(returnUrl !== undefined && { returnUrl }),
      },
    },
  );
  return { url: pickUrl(raw.data) };
}

export const payment = {
  /** GET /vnpay/payment?order_id=X — VNPay redirect URL (domestic + intl cards). */
  async getVnpayPaymentUrl(
    orderId: string,
    returnUrl?: string,
  ): Promise<{ url: string }> {
    return getPaymentUrl('vnpay', orderId, returnUrl);
  },

  /** GET /payx/payment?order_id=X — PayX redirect URL. */
  async getPayxPaymentUrl(
    orderId: string,
    returnUrl?: string,
  ): Promise<{ url: string }> {
    return getPaymentUrl('payx', orderId, returnUrl);
  },

  /** GET /payoo/payment?order_id=X — Payoo redirect URL. */
  async getPayooPaymentUrl(
    orderId: string,
    returnUrl?: string,
  ): Promise<{ url: string }> {
    return getPaymentUrl('payoo', orderId, returnUrl);
  },

  /** GET /onepay/payment?order_id=X — OnePay (international cards) redirect. */
  async getOnepayPaymentUrl(
    orderId: string,
    returnUrl?: string,
  ): Promise<{ url: string }> {
    return getPaymentUrl('onepay', orderId, returnUrl);
  },

  /**
   * GET /onepay/check?order_id=X — poll OnePay payment status.
   * Mobile uses this after user closes WebView (OnePay doesn't always
   * deliver clean callback). Returns `{ status }` where status is the
   * backend's raw enum (TBD — typically `SUCCESS`/`PENDING`/`FAILED`).
   */
  async checkOnepayStatus(orderId: string): Promise<{ status: string }> {
    const raw = await network().get<{
      data: { status?: string } | string;
    }>('/onepay/check', { params: { order_id: orderId } });
    const data = raw.data;
    const status = typeof data === 'string' ? data : (data?.status ?? 'UNKNOWN');
    return { status };
  },
};
