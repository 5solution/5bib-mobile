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
    courseName: String(r.course_name ?? r.courseName ?? ''),
    athleteName: String(r.athlete_name ?? r.athleteName ?? ''),
    // Backend wire field is `total_price` (not `total_amount`).
    totalAmount: toNumber(
      r.total_amount ?? r.totalAmount ?? r.total_price ?? r.total ?? 0,
    ),
    subtotal: toNumber(
      r.subtotal ?? r.sub_total ?? r.sub_total_price ?? 0,
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
    paidAt: (r.paid_at as string | undefined) ?? (r.paidAt as string | undefined),
    paymentMethod:
      (r.payment_method as string | undefined) ??
      (r.paymentMethod as string | undefined),
    ticketId:
      (r.ticket_id as string | undefined) ??
      (r.ticketId as string | undefined),
    bib: (r.bib as string | undefined) ?? (r.code_value as string | undefined),
  };
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
