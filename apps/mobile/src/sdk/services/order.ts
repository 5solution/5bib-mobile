/**
 * apps/mobile/src/sdk/services/order.ts
 *
 * Order / checkout service.
 *
 * Source: docs/API_REFERENCE.md "EPIC-3 Checkout (Order + Payment)".
 *         01-ba-prd-epic-3-checkout.md
 *
 * ⚠️ Backend typo: `finalcial_status` — normalizer fixes to `financialStatus`.
 * ⚠️ POST /order/create uses BOTH query param (`race_id`) AND body (`{order: {...}}`).
 * ⚠️ NO idempotency-key — mobile MUST debounce double-tap on submit.
 */
import { network } from '../core';
import type {
  Order,
  OrderCreateInput,
  OrderCreateResponse,
  Pagination,
} from '../models';
import { normalizeOrder } from '../normalize/order';

export interface ListMyOrdersParams {
  pageNo?: number;
  pageSize?: number;
  sortField?: string;
  sortDirection?: 'ASC' | 'DESC';
  internalStatus?: string;
  financialStatus?: string;
}

export interface ListMyOrdersResponse {
  items: Order[];
  pagination: Pagination;
}

/** Backend gender enum (uppercase). */
type BackendGender = 'MALE' | 'FEMALE' | 'UNKNOWN';

function toBackendGender(g: string): BackendGender {
  const v = g.toUpperCase();
  if (v === 'MALE' || v === 'FEMALE' || v === 'UNKNOWN') return v;
  if (v === 'OTHER') return 'UNKNOWN';
  return 'UNKNOWN';
}

/**
 * Map clean AthleteCreatePayload → backend `athlete_sub_info` entry.
 * Mixed snake/camel per docs/API_REFERENCE.md EPIC-3.
 */
function mapAthleteToSubInfo(
  a: OrderCreateInput['athlete'],
): Record<string, unknown> {
  return {
    email: a.email.trim().toLowerCase(),
    name: `${a.firstName} ${a.lastName}`.trim(),
    first_name: a.firstName,
    last_name: a.lastName,
    contact_phone: a.phone,
    id_number: a.idNumber,
    // QC: nationality default "Việt Nam" contains a diacritic that Hermes'
    // JSON.stringify sometimes serializes as bytes the backend rejects with
    // "Mismatch request param". Strip to ASCII for the wire while keeping
    // the form display in Vietnamese. Backend tolerates "Vietnam".
    nationality: a.nationality === 'Việt Nam' ? 'Vietnam' : a.nationality,
    gender: toBackendGender(a.gender),
    dob: a.dob,
    tshirt_size: a.tshirtSize,
    racekit: a.racekit,
    address: a.address ?? '',
    name_on_bib: a.nameOnBib,
    // Web format: "<phone>-<name>" — keep parity until backend confirms otherwise
    sosPhone: `${a.emergencyContactPhone}-${a.emergencyContactName}`,
    sos_phone: `${a.emergencyContactPhone}-${a.emergencyContactName}`,
    blood_type: a.bloodType ?? '',
    medical_info: a.medicalInformation ?? '',
    current_medication: a.currentMedication ?? '',
    club: a.club ?? '',
    achievements: a.achievements ?? '',
  };
}

export const order = {
  /**
   * POST /order/create?race_id=X — create a new order.
   * Body: `{ order: { ...rich schema } }`. See API_REFERENCE EPIC-3.
   * ⚠️ noRetry — order creation is NOT idempotent.
   */
  async createOrder(input: OrderCreateInput): Promise<OrderCreateResponse> {
    const subInfo = mapAthleteToSubInfo(input.athlete);

    const body = {
      order: {
        email: input.athlete.email.trim().toLowerCase(),
        included_insurance: input.includedInsurance ?? false,
        financial_status: 'pending',
        send_receipt: true,
        send_fulfillment_receipt: true,
        currency: 'VND',
        tags: '',
        status: 'open',
        discount_codes: input.discountCode
          ? [{ code: input.discountCode }]
          : [],
        line_items: [
          {
            quantity: 1,
            // Backend REQUIRES legacy Shopify-style product variant id, NOT
            // race_course.id. Verified 2026-05-28 — sending courseId returns
            // 400 "This order should contain only tickets/race-course in race X".
            // Real variant_id comes from ticket_type.variant_id (e.g. 124495055
            // for race 305 course 552). courseId fallback only for the legacy
            // single-tier path; modern flow always has a ticketType selected.
            variant_id: Number(input.variantId ?? input.courseId),
            ticket_type_id: input.ticketTypeId
              ? Number(input.ticketTypeId)
              : undefined,
            athlete_sub_info: [subInfo],
          },
        ],
      },
    };

    const raw = await network().post<{
      data: { order_id: string | number; total?: number; total_amount?: number };
    }>('/order/create', body, {
      params: { race_id: input.raceId },
      noRetry: true,
    });

    return {
      orderId: String(raw.data.order_id),
      totalAmount: Number(raw.data.total ?? raw.data.total_amount ?? 0),
      status: 'pending',
    };
  },

  /**
   * GET /order — list current user's orders.
   * Filter `internal_status`: COMPLETE / PENDING / CANCELLED (others TBD).
   * Backend typo preserved on wire: `finalcial_status` (sic).
   */
  async listMyOrders(
    params: ListMyOrdersParams = {},
  ): Promise<ListMyOrdersResponse> {
    const raw = await network().get<{
      data: {
        list: unknown[];
        totalPages: number;
        currentPage: number;
        pageSize?: number;
        totalCount?: number;
      };
    }>('/order', {
      params: {
        // **Mixed conventions** verified live 2026-05-29: backend wants
        // camelCase pageNo/sortField/sortDirection (NOT snake_case — those
        // are silently ignored and always return page 0 sorted by id ASC),
        // but snake_case internal_status / finalcial_status. Yes, painful.
        pageNo: params.pageNo,
        pageSize: params.pageSize,
        sortField: params.sortField ?? 'processedOn',
        sortDirection: params.sortDirection ?? 'DESC',
        internal_status: params.internalStatus,
        // typo preserved on wire — fixed in normalizer
        finalcial_status: params.financialStatus,
      },
    });

    return {
      items: (raw.data.list ?? []).map(normalizeOrder),
      pagination: {
        currentPage: raw.data.currentPage,
        totalPages: raw.data.totalPages,
        pageSize: raw.data.pageSize ?? params.pageSize ?? 10,
        totalCount: raw.data.totalCount,
      },
    };
  },

/**
   * GET /order/by-id?order_id=X — order detail.
   */
  async getOrderById(orderId: string): Promise<Order> {
    const raw = await network().get<{ data: unknown }>('/order/by-id', {
      params: { order_id: orderId },
    });
    return normalizeOrder(raw.data);
  },

  /**
   * PUT /order/update?order_id=X — update order line items / email.
   */
  async updateOrder(
    orderId: string,
    input: { email?: string; lineItems?: unknown[] },
  ): Promise<void> {
    const body: Record<string, unknown> = {};
    if (input.email !== undefined) body.email = input.email;
    if (input.lineItems !== undefined) body.line_items = input.lineItems;
    await network().put('/order/update', body, {
      params: { order_id: orderId },
      noRetry: true,
    });
  },

  /**
   * DELETE /order/delete?order_id=X — cancel order.
   */
  async cancelOrder(orderId: string): Promise<void> {
    await network().delete('/order/delete', undefined, {
      params: { order_id: orderId },
      noRetry: true,
    });
  },

  /**
   * POST /order/fake-payment — DEV ONLY mark order as paid.
   * 🚨 DO NOT SHIP TO PROD. Used by mobile dev for testing WebView flow
   * without going through real gateway.
   */
  async fakePayment(
    orderId: string,
    amount: number,
    email: string,
  ): Promise<void> {
    await network().post('/order/fake-payment', null, {
      params: {
        order_id: orderId,
        amount,
        email: email.trim().toLowerCase(),
      },
      noRetry: true,
    });
  },

  /**
   * GET /price_rule/detail?title=X — lookup discount code by title.
   */
  async getDiscountByCode(code: string): Promise<unknown> {
    const raw = await network().get<{ data: unknown }>('/price_rule/detail', {
      params: { title: code },
    });
    return raw.data;
  },

  /**
   * GET /price_rule/list?race_id=X&page_no=1&page_size=10 — list discounts for a race.
   */
  async listDiscounts(
    raceId: string,
    pageNo: number = 1,
    pageSize: number = 10,
  ): Promise<unknown[]> {
    const raw = await network().get<{
      data: unknown[] | { list?: unknown[] };
    }>('/price_rule/list', {
      params: { race_id: raceId, page_no: pageNo, page_size: pageSize },
    });
    if (Array.isArray(raw.data)) return raw.data;
    return raw.data?.list ?? [];
  },
};
