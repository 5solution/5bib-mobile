/**
 * apps/mobile/src/sdk/services/ticket.ts
 *
 * Ticket service — list user tickets, change course, get ticket detail.
 *
 * Source: 01-ba-prd-epic-4-tickets.md
 * BR-TICKETS-01: 8 athlete statuses. BR-TICKETS-01b: per-status actions.
 */
import { network } from '../core';
import type {
  Ticket,
  Pagination,
  EstimateChangeResponse,
} from '../models';
import { normalizeTicket } from '../normalize/ticket';

export interface ListUserTicketsParams {
  athleteStatus?: 'ALL' | string;
  pageNo?: number;
  codeStatuses?: string;
}

export interface ListUserTicketsResponse {
  items: Ticket[];
  pagination: Pagination;
}

export const ticket = {
  /**
   * GET /codes/fetch-by-user — current user's tickets, filtered by
   * athlete status (default ALL).
   *
   * BR-TICKETS-01: 8 athlete statuses.
   */
  async listUserTickets(
    params: ListUserTicketsParams = {},
  ): Promise<ListUserTicketsResponse> {
    const {
      athleteStatus = 'ALL',
      pageNo = 1,
      codeStatuses = 'ACTIVE',
    } = params;

    const queryParams: Record<string, unknown> = {
      sortDirection: 'DESC',
      pageNo,
      code_statuses: codeStatuses,
    };
    if (athleteStatus !== 'ALL') {
      queryParams.athlete_status = athleteStatus;
    }

    const raw = await network().get<{
      data: {
        list: unknown[];
        totalPages: number;
        currentPage: number;
        pageSize?: number;
        totalCount?: number;
      };
    }>('/codes/fetch-by-user', { params: queryParams });

    return {
      items: (raw.data.list ?? []).map(normalizeTicket),
      pagination: {
        currentPage: raw.data.currentPage,
        totalPages: raw.data.totalPages,
        pageSize: raw.data.pageSize ?? 10,
        totalCount: raw.data.totalCount,
      },
    };
  },

  /**
   * GET /codes/get/:id — ticket detail by code value or ID.
   */
  async getTicketById(ticketId: string): Promise<Ticket> {
    const raw = await network().get<{ data: unknown }>(
      `/codes/get/${ticketId}`,
    );
    return normalizeTicket(raw.data);
  },

  /**
   * GET /codes/estimate/change-course — preview fee for changing course.
   */
  async estimateChangeCourse(input: {
    codeValue: string;
    toCourseId: string;
  }): Promise<EstimateChangeResponse> {
    const raw = await network().get<{
      data: {
        change_course_fee: number;
        final_value: number;
        note: string;
      };
    }>('/codes/estimate/change-course', {
      params: {
        code_value: input.codeValue,
        to_course_id: input.toCourseId,
      },
    });
    return {
      changeCourseFee: raw.data.change_course_fee,
      finalValue: raw.data.final_value,
      note: raw.data.note,
    };
  },

  /**
   * PUT /codes/change-course — commit course change.
   * BR-CHECKOUT-26: validate new course min_age vs athlete dob at event date.
   */
  async changeCourse(input: {
    codeValue: string;
    toCourseId: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    // TODO: normalize payload — see web `changeCourse` for legacy shape.
    await network().put('/codes/change-course', input.payload, {
      params: {
        code_value: input.codeValue,
        to_course_id: input.toCourseId,
      },
      noRetry: true,
    });
  },

  /**
   * POST /athlete/transfer?code_value=&receipt_email=
   * BR-TICKETS-20: backend returns 8 possible error codes
   * (OUTSIDE_TRANSFER_PERIOD, RACE_REASSIGN_TIME_INVALID,
   * CANNOT_TRANSFER_ZERO_PRICE, SAME_RECEIVER, EMAIL_NOT_EXIST,
   * TICKET_ALREADY_TRANSFERRED, RACE_FINISHED, EXCEED_MAX_TRANSFER_COUNT).
   * Map to Vietnamese via `transfer-error-codes.ts`.
   */
  async transferTicket(input: {
    codeValue: string;
    receiptEmail: string;
    message?: string;
  }): Promise<void> {
    await network().post(
      '/athlete/transfer',
      { message: input.message ?? '' },
      {
        params: {
          code_value: input.codeValue,
          receipt_email: input.receiptEmail.trim().toLowerCase(),
        },
        noRetry: true,
      },
    );
  },

  /**
   * GET /codes/skip-liability-code — fetch the disclaimer-skip token
   * used when guardian signs on behalf of minor athlete.
   */
  async getSkipLiabilityCode(codeValue: string): Promise<unknown> {
    const raw = await network().get<{ data: unknown }>(
      '/codes/skip-liability-code',
      { params: { code_value: codeValue } },
    );
    return raw.data;
  },
};
