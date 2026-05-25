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
    orderNumber: String(r.order_number ?? r.orderNumber ?? r.id ?? ''),
    raceId: String(r.race_id ?? r.raceId ?? ''),
    raceName: String(r.race_name ?? r.raceName ?? ''),
    courseId: String(r.course_id ?? r.race_course_id ?? r.courseId ?? ''),
    courseName: String(r.course_name ?? r.courseName ?? ''),
    athleteName: String(r.athlete_name ?? r.athleteName ?? ''),
    totalAmount: toNumber(r.total_amount ?? r.totalAmount ?? r.total ?? 0),
    subtotal: toNumber(r.subtotal ?? r.sub_total ?? 0),
    discountAmount: toNumber(r.discount_amount ?? r.discountAmount ?? 0),
    // typo fix: backend `finalcial_status` → clean `financialStatus`
    financialStatus: normalizeFinancialStatus(
      r.financial_status ??
        r.financialStatus ??
        r.finalcial_status ?? // sic — backend typo
        r.status,
    ),
    internalStatus: String(r.internal_status ?? r.internalStatus ?? ''),
    createdAt: String(r.created_at ?? r.createdAt ?? r.created_on ?? ''),
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
