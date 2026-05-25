/**
 * apps/mobile/src/sdk/services/order.ts
 *
 * Order / checkout service. Includes payment gateway URL building.
 *
 * Source: 01-ba-prd-epic-3-checkout.md
 * Backend typo: `finalcial_status` — normalizer fixes to `financialStatus`.
 */
import { network } from '../core';
import type {
  Order,
  OrderCreateInput,
  OrderCreateResponse,
  Pagination,
  DiscountCheckResponse,
} from '../models';
import { PaymentMethod } from '../constants/payment';
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

export const order = {
  /**
   * GET /order — current user's orders.
   * Note: backend field `finalcial_status` (typo) maps to clean `financialStatus`.
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
        pageNo: params.pageNo,
        pageSize: params.pageSize,
        sortField: params.sortField,
        sortDirection: params.sortDirection,
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
   * POST /order/create?race_id=... — create a new order.
   * TODO: map clean OrderCreateInput → legacy backend payload
   * (athlete fields snake_case, sosPhone format, name composition).
   */
  async createOrder(input: OrderCreateInput): Promise<OrderCreateResponse> {
    // TODO: extract athlete mapper (similar to web `mapFormDataToPayload`)
    const legacyPayload = {
      race_course_id: input.courseId,
      // ... athlete fields snake_case
      discount_code: input.discountCode,
    };

    const raw = await network().post<{
      data: { order_id: string | number; total_amount: number };
    }>('/order/create', legacyPayload, {
      params: { race_id: input.raceId },
      noRetry: true, // idempotency-sensitive
    });

    return {
      orderId: String(raw.data.order_id),
      totalAmount: raw.data.total_amount,
      status: 'pending',
    };
  },

  /**
   * GET /order/by-id?order_id=... — order detail.
   */
  async getOrderById(orderId: string): Promise<Order> {
    const raw = await network().get<{ data: unknown }>('/order/by-id', {
      params: { order_id: orderId },
    });
    return normalizeOrder(raw.data);
  },

  /**
   * Build payment gateway URL.
   * Web routes to different endpoints per method:
   *   - VNPay family (VN_BANK, INT_CARD, VNPAY_QR) → `/vnpay/payment`
   *   - PayX (PAYX_DOMESTIC_CARD, PAYX_QR)        → `/payx/payment`
   *   - PAYOO                                      → `/payoo/payment`
   *   - Others (Momo, Zalo, OnePay, ...)           → `/{method}/payment`
   */
  async getCheckoutUrl(input: {
    orderId: string;
    method: PaymentMethod;
    returnUrl: string;
  }): Promise<string> {
    const { orderId, method, returnUrl } = input;

    const endpoint = isVNPayFamily(method)
      ? '/vnpay/payment'
      : isPayX(method)
        ? '/payx/payment'
        : method === PaymentMethod.PAYOO
          ? '/payoo/payment'
          : `/${method}/payment`;

    const params: Record<string, unknown> = isVNPayFamily(method)
      ? { order_id: orderId, returnUrl, vnp_BankCode: method }
      : isPayX(method)
        ? { order_id: orderId, return_url: returnUrl, payment_method: method }
        : { order_id: orderId, returnUrl };

    const raw = await network().get<{ data: string }>(endpoint, { params });
    return raw.data;
  },

  /**
   * Check discount code validity.
   * TODO: confirm exact endpoint with backend — web does not expose this
   * as a separate call; check if `/discount/check` exists or if it's
   * computed during `createOrder`.
   */
  async checkDiscountCode(input: {
    code: string;
    raceId: string;
    courseId: string;
  }): Promise<DiscountCheckResponse> {
    // TODO: implement once backend endpoint confirmed
    const raw = await network().get<{ data: unknown }>('/discount/check', {
      params: {
        code: input.code,
        race_id: input.raceId,
        course_id: input.courseId,
      },
    });
    return raw.data as DiscountCheckResponse;
  },
};

function isVNPayFamily(m: PaymentMethod): boolean {
  return (
    m === PaymentMethod.VN_BANK ||
    m === PaymentMethod.INT_CARD ||
    m === PaymentMethod.VNPAY_QR
  );
}

function isPayX(m: PaymentMethod): boolean {
  return m === PaymentMethod.PAYX_DOMESTIC_CARD || m === PaymentMethod.PAYX_QR;
}
