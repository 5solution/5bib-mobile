/**
 * apps/mobile/src/sdk/services/priceRule.ts
 *
 * Price rule / discount code service.
 * Wraps backend discount validation + early-bird pricing windows.
 *
 * Source: 01-ba-prd-epic-3-checkout.md (discount code + price rules)
 * TODO: confirm exact backend endpoints with team — web does not have a
 * standalone price-rule module today (logic is embedded in order create).
 */
import { network } from '../core';
import type { DiscountCheckResponse } from '../models';

export interface PriceRule {
  id: string;
  courseId: string;
  price: number;
  currency: 'VND';
  startDate: string;
  endDate: string;
  label?: string; // e.g. "Early Bird", "Regular", "Late Reg"
}

export const priceRule = {
  /**
   * GET /price-rule?course_id=... — list pricing windows for a course.
   * TODO: confirm endpoint path with backend.
   */
  async listPriceRulesByCourse(courseId: string): Promise<PriceRule[]> {
    const raw = await network().get<{ data: unknown[] }>('/price-rule', {
      params: { course_id: courseId },
    });
    // TODO: normalize snake_case → camelCase
    return (raw.data as PriceRule[]) ?? [];
  },

  /**
   * Validate discount code against a given order context.
   * TODO: confirm endpoint — may be wrapped inside `/order/create`.
   */
  async validateDiscountCode(input: {
    code: string;
    raceId: string;
    courseId: string;
  }): Promise<DiscountCheckResponse> {
    try {
      const raw = await network().get<{
        data: {
          valid: boolean;
          discount_amount?: number;
          discount_percent?: number;
          error_code?: string;
        };
      }>('/discount/check', {
        params: {
          code: input.code,
          race_id: input.raceId,
          course_id: input.courseId,
        },
        noRetry: true,
      });

      return {
        valid: raw.data.valid,
        discountAmount: raw.data.discount_amount,
        discountPercent: raw.data.discount_percent,
        errorCode: raw.data.error_code as DiscountCheckResponse['errorCode'],
      };
    } catch (err) {
      // TODO: map error responses to DiscountCheckResponse.errorCode enum.
      return { valid: false, errorCode: 'NOT_FOUND' };
    }
  },
};
