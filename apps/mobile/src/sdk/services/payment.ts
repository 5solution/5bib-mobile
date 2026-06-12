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

/**
 * Unwrap the gateway URL from the BE envelope. Verified live 2026-06-12 on
 * DEV for ALL four gateways: the body is double-nested
 * `{data:{data:"https://…"},success:true}` (web reads `body.data.data` in
 * its /api/checkout route). The old reader looked for `data.url`, which
 * never existed → every real payment showed "Không tải được trang thanh
 * toán". Walks `data` links so bare-string / `{url}` / `{data:"…"}` legacy
 * shapes keep working, and rejects non-http garbage.
 */
function pickUrl(body: unknown): string {
  let cur: unknown = body;
  for (let depth = 0; depth < 4 && cur != null; depth++) {
    if (typeof cur === 'string') {
      return cur.startsWith('http') ? cur : '';
    }
    if (typeof cur !== 'object') return '';
    const o = cur as Record<string, unknown>;
    if (typeof o.url === 'string') return o.url.startsWith('http') ? o.url : '';
    cur = o.data;
  }
  return '';
}

/**
 * Pull the human-readable BE message out of an error envelope. Live shapes
 * seen on DEV: `{success:false,error:{code,message}}` (price_rule) AND
 * `{success:false,error:{error:{code,message}}}` (props) — message depth
 * varies, so walk the `error` links.
 */
export function pickApiErrorMessage(body: unknown): string | undefined {
  let cur: unknown = body;
  for (let depth = 0; depth < 4 && cur && typeof cur === 'object'; depth++) {
    const o = cur as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message) return o.message;
    cur = o.error;
  }
  return undefined;
}

async function getPaymentUrl(
  gateway: PaymentGateway,
  orderId: string,
  returnUrl?: string,
): Promise<{ url: string; errorMessage?: string }> {
  const raw = await network().get<unknown>(`/${gateway}/payment`, {
    params: {
      order_id: orderId,
      ...(returnUrl !== undefined && { returnUrl }),
    },
  });
  const url = pickUrl(raw);
  // Business errors arrive as HTTP 200 + success:false on this backend, so
  // the Fetcher never throws — surface the BE message ("order already paid",
  // "order expired", …) instead of a generic load failure.
  return url ? { url } : { url, errorMessage: pickApiErrorMessage(raw) };
}

export const payment = {
  /** GET /vnpay/payment?order_id=X — VNPay redirect URL (domestic + intl cards). */
  async getVnpayPaymentUrl(
    orderId: string,
    returnUrl?: string,
  ): Promise<{ url: string; errorMessage?: string }> {
    return getPaymentUrl('vnpay', orderId, returnUrl);
  },

  /** GET /payx/payment?order_id=X — PayX redirect URL. */
  async getPayxPaymentUrl(
    orderId: string,
    returnUrl?: string,
  ): Promise<{ url: string; errorMessage?: string }> {
    return getPaymentUrl('payx', orderId, returnUrl);
  },

  /** GET /payoo/payment?order_id=X — Payoo redirect URL. */
  async getPayooPaymentUrl(
    orderId: string,
    returnUrl?: string,
  ): Promise<{ url: string; errorMessage?: string }> {
    return getPaymentUrl('payoo', orderId, returnUrl);
  },

  /** GET /onepay/payment?order_id=X — OnePay (international cards) redirect. */
  async getOnepayPaymentUrl(
    orderId: string,
    returnUrl?: string,
  ): Promise<{ url: string; errorMessage?: string }> {
    return getPaymentUrl('onepay', orderId, returnUrl);
  },

  /**
   * GET /onepay/check?order_id=X — poll OnePay payment status.
   * Mobile uses this after user closes WebView (OnePay doesn't always
   * deliver clean callback). Wire shape (verified live 2026-06-12):
   * `{data:{data:{success:boolean, query_url:…}}}` — double-nested like the
   * payment-URL endpoints, keyed by `success` not a status enum. Falls back
   * to a `status` string for older shapes; anything else → 'UNKNOWN' (the
   * result screen then polls the order itself).
   */
  async checkOnepayStatus(orderId: string): Promise<{ status: string }> {
    const raw = await network().get<unknown>('/onepay/check', {
      params: { order_id: orderId },
    });
    // Descend the `data` chain FIRST: the transport envelope carries its own
    // `success:true` on every 200 (live 2026-06-12 the body is
    // {data:{data:{success:false,query_url}},success:true} even for unpaid
    // orders) — reading `success` before descending would report SUCCESS for
    // every order. Only the innermost object speaks for the payment.
    let cur: unknown = raw;
    for (let depth = 0; depth < 4; depth++) {
      if (cur == null || typeof cur !== 'object') break;
      const next = (cur as Record<string, unknown>).data;
      if (next == null) break;
      cur = next;
    }
    if (typeof cur === 'string') return { status: cur };
    if (cur && typeof cur === 'object') {
      const o = cur as Record<string, unknown>;
      if (typeof o.status === 'string') return { status: o.status };
      if (typeof o.success === 'boolean') {
        return { status: o.success ? 'SUCCESS' : 'UNKNOWN' };
      }
    }
    return { status: 'UNKNOWN' };
  },
};
