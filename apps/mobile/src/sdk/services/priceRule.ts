/**
 * apps/mobile/src/sdk/services/priceRule.ts
 *
 * Price rule / discount code service. Wraps backend `/price_rule/*` endpoints.
 *
 * Source: docs/API_REFERENCE.md "EPIC-3 Checkout" (price_rule sub-endpoints).
 *
 * NOTE: The order service (services/order.ts) also exposes `getDiscountByCode`
 * + `listDiscounts` for convenience inside checkout flow. This service is the
 * lower-level wrapper for standalone discount lookup.
 */
import { network } from '../core';

export interface PriceRule {
  id: string;
  raceId?: string;
  title: string;
  /** Discount amount (positive number) — meaning depends on `type`. */
  value?: number;
  /** Discount type: percentage / fixed amount. */
  type?: 'percentage' | 'fixed';
  startDate?: string;
  endDate?: string;
  usageLimit?: number;
  usedCount?: number;
}

/**
 * Wire discount-kind field is `value_type` with values 'fixed_amount' /
 * 'percentage' / 'Fixed_price' (web checkout's getDiscountValue switch) —
 * `type` does not exist on the DTO, so the old mapping left it undefined and
 * every percentage voucher was treated as a fixed-VND amount.
 */
function normalizeDiscountType(v: unknown): PriceRule['type'] {
  const s = String(v ?? '').toLowerCase();
  if (s === 'percentage') return 'percentage';
  if (s === 'fixed_amount' || s === 'fixed_price' || s === 'fixed') return 'fixed';
  return undefined;
}

function normalizePriceRule(raw: unknown): PriceRule {
  const r = (raw ?? {}) as Record<string, unknown>;
  const value =
    (r.value as number | undefined) ?? (r.amount as number | undefined);
  return {
    id: String(r.id ?? r.price_rule_id ?? ''),
    raceId: r.race_id != null ? String(r.race_id) : undefined,
    title: String(r.title ?? r.code ?? ''),
    // Shopify-style price rules store discounts as NEGATIVE values — web
    // wraps every read in Math.abs (checkout getDiscountValue); without it a
    // fixed -50000 voucher would *increase* the displayed total.
    value: value != null ? Math.abs(value) : undefined,
    type: normalizeDiscountType(r.value_type ?? r.type),
    startDate: (r.start_date as string | undefined) ?? (r.startDate as string | undefined),
    endDate: (r.end_date as string | undefined) ?? (r.endDate as string | undefined),
    usageLimit: r.usage_limit as number | undefined,
    usedCount: r.used_count as number | undefined,
  };
}

export const priceRule = {
  /**
   * GET /price_rule/detail?title=X — lookup a single discount by code/title.
   * Returns null if not found (backend may 200 + success:false OR 404 — both
   * map to null).
   */
  async getByCode(code: string): Promise<PriceRule | null> {
    try {
      const raw = await network().get<{ data: unknown; success?: boolean }>(
        '/price_rule/detail',
        { params: { title: code }, noRetry: true },
      );
      if (raw.success === false || !raw.data) return null;
      return normalizePriceRule(raw.data);
    } catch {
      return null;
    }
  },

  /**
   * GET /price_rule/list?race_id=X&pageNo=1&pageSize=10 — paginated list.
   */
  async listByRace(
    raceId: string,
    pageNo: number = 1,
    pageSize: number = 10,
  ): Promise<PriceRule[]> {
    const raw = await network().get<{
      data: unknown[] | { list?: unknown[] };
    }>('/price_rule/list', {
      params: { race_id: raceId, pageNo, pageSize },
    });
    const list = Array.isArray(raw.data) ? raw.data : (raw.data?.list ?? []);
    return list.map(normalizePriceRule);
  },

  /**
   * GET /price_rule/find-one?text=X&race_id=Y — legacy lookup (web parity).
   * Preferred call is `getByCode` — this is kept for parity with selling-web.
   */
  async findOne(text: string, raceId?: string): Promise<PriceRule | null> {
    try {
      const raw = await network().get<{ data: unknown }>(
        '/price_rule/find-one',
        {
          params: {
            text,
            ...(raceId !== undefined && { race_id: raceId }),
          },
          noRetry: true,
        },
      );
      return raw.data ? normalizePriceRule(raw.data) : null;
    } catch {
      return null;
    }
  },
};
