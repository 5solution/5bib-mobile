/**
 * apps/mobile/src/sdk/normalize/order.ts
 *
 * Order response normalizer. Fixes backend typo `finalcial_status`.
 *
 * Source: 01-ba-prd-overview.md, 01-ba-prd-epic-3-checkout.md
 */
import type { Order } from '../models';

export function normalizeOrder(raw: unknown): Order {
  const r = (raw ?? {}) as Record<string, unknown>;

  // Course name is NOT a top-level field — it lives on the line item's
  // ticketType (web parity: line-item.tsx renders
  // `${race_course_name} - ${type_name}`, e.g. "12KM - Early Bird").
  // Secondary source: ticket_codes[0].course_name. Verified live 2026-06-12
  // on /order/by-id (order 200002542).
  const lineItems = Array.isArray(r.line_items)
    ? (r.line_items as Array<Record<string, unknown>>)
    : [];
  const li0 = lineItems[0];
  const tt0 = (li0?.ticketType ?? {}) as Record<string, unknown>;
  const ticketCodes = Array.isArray(r.ticket_codes)
    ? (r.ticket_codes as Array<Record<string, unknown>>)
    : [];
  const courseFromLineItem = tt0.race_course_name
    ? `${tt0.race_course_name}${tt0.type_name ? ` - ${tt0.type_name}` : ''}`
    : undefined;

  return {
    id: String(r.id ?? r.order_id ?? ''),
    // Backend uses `name` for the printable order code (e.g. "#5B200002347IB").
    // Web shows this verbatim — keep the leading "#" if present so we don't
    // need to re-add it client-side.
    orderNumber: String(
      r.order_number ?? r.orderNumber ?? r.name ?? r.id ?? '',
    ),
    raceId: String(r.race_id ?? r.raceId ?? ''),
    // Backend nests race detail under `race.title`. Fall back through
    // race_name / raceName for legacy callers.
    raceName: String(
      r.race_name ??
        r.raceName ??
        ((r.race as { title?: string } | undefined)?.title ?? ''),
    ),
    courseId: String(r.course_id ?? r.race_course_id ?? r.courseId ?? ''),
    courseName: String(
      r.course_name ??
        r.courseName ??
        courseFromLineItem ??
        ticketCodes[0]?.course_name ??
        '',
    ),
    athleteName: String(r.athlete_name ?? r.athleteName ?? ''),
    // Backend wire field is `total_price` (not `total_amount`).
    totalAmount: toNumber(
      r.total_amount ?? r.totalAmount ?? r.total_price ?? r.total ?? 0,
    ),
    // Web's subtotal row reads total_line_items_price (934400 on order
    // 200002542) — NOT sub_total_price (1025056 there, some VAT-inclusive
    // figure that doesn't reconcile with discount/total on screen).
    subtotal: toNumber(
      r.total_line_items_price ??
        r.subtotal ??
        r.sub_total ??
        r.sub_total_price ??
        0,
    ),
    discountAmount: toNumber(
      r.discount_amount ?? r.discountAmount ?? r.total_discounts ?? 0,
    ),
    // typo fix: backend `finalcial_status` → clean `financialStatus`
    financialStatus: normalizeFinancialStatus(
      r.financial_status ??
        r.financialStatus ??
        r.finalcial_status ?? // sic — backend typo
        r.status,
    ),
    internalStatus: String(r.internal_status ?? r.internalStatus ?? ''),
    // Backend uses `processed_on` as the canonical creation timestamp on
    // orders (verified 2026-05-29: every fresh order has processed_on set,
    // `created_at`/`created_on` are absent). Fall back through legacy keys
    // for older callers / mock data.
    createdAt: String(
      r.processed_on ?? r.created_at ?? r.createdAt ?? r.created_on ?? '',
    ),
    // Wire field is `payment_on` (web reads order.payment_on) — `paid_at`
    // never existed, so transaction time rendered empty even on paid orders.
    paidAt:
      (r.payment_on as string | undefined) ??
      (r.paid_at as string | undefined) ??
      (r.paidAt as string | undefined),
    // Backend stores literal 'UNKNOWN' when the gateway is unidentified
    // (e.g. fake payment). Web hides the row entirely for UNKNOWN — null it
    // here so the screen's `paymentMethod &&` guard does the same.
    paymentMethod: normalizePaymentMethod(
      (r.payment_method as string | undefined) ??
        (r.paymentMethod as string | undefined),
    ),
    // Per-line purchase facts for the product card (screen previously
    // hardcoded "x1" + showed order TOTAL as the unit price).
    lineQuantity: li0?.quantity != null ? toNumber(li0.quantity) : undefined,
    linePrice: li0?.price != null ? toNumber(li0.price) : undefined,
    ticketId:
      (r.ticket_id as string | undefined) ??
      (r.ticketId as string | undefined),
    bib: (r.bib as string | undefined) ?? (r.code_value as string | undefined),
  };
}

function normalizePaymentMethod(v: string | undefined): string | undefined {
  if (!v || v.toUpperCase() === 'UNKNOWN') return undefined;
  return v;
}

function normalizeFinancialStatus(s: unknown): Order['financialStatus'] {
  const v = String(s ?? '').toLowerCase();
  if (v === 'paid' || v === 'pending' || v === 'voided' || v === 'failed') {
    return v;
  }
  // Backend variants seen in prod data:
  if (v === 'authorized' || v === 'partially_paid') return 'pending';
  if (v === 'refunded' || v === 'partially_refunded' || v === 'cancelled') return 'voided';
  // Default fallback
  return 'pending';
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
