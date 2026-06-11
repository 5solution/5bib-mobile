/**
 * apps/mobile/src/sdk/services/ticket.ts
 *
 * Ticket service — list user tickets, get ticket detail, transfer, change course.
 *
 * Source: docs/API_REFERENCE.md "EPIC-4 Tickets / BIB / Athlete".
 *         01-ba-prd-epic-4-tickets.md
 *
 * BR-TICKETS-01: 8 athlete statuses. BR-TICKETS-01b: per-status actions.
 *
 * ⚠️ PROBE-LIVE items:
 *   - `/codes/estimate/change-course` + `/codes/change-course` — backend may
 *     return 403 empty body (endpoint doesn't exist). If so, EPIC-4 change-course
 *     scope should be dropped (already flagged in PRD update).
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
   */
  async listMyTickets(
    params: ListUserTicketsParams = {},
  ): Promise<ListUserTicketsResponse> {
    const {
      athleteStatus = 'ALL',
      pageNo = 1,
      codeStatuses = 'ACTIVE',
    } = params;

    // **Mixed conventions** verified live 2026-05-29: backend wants
    // camelCase pageNo/sortField/sortDirection — snake_case versions are
    // silently ignored. But filter params remain snake_case
    // (code_statuses, athlete_status). Default sort newest-first.
    const queryParams: Record<string, unknown> = {
      pageNo,
      sortField: 'createdOn',
      sortDirection: 'DESC',
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
   * GET /codes/skip-liability-code?code_value=X — issue the waiver-signing
   * secret for a ticket the BEARER owns. This is the authenticated shortcut
   * web uses for "Ký miễn trừ" on ticket detail: the secret replaces the
   * email-OTP step entirely (sign page = /pub/ticket-by-code/{secret} +
   * POST /pub/aggree-skip-liability/{secret}).
   *
   * Response is DOUBLE-nested (verified live 2026-06-11 on ticket
   * DTNT5610K-1061-TAXRR8JS): `{data:{data:"<athleteId>-<sha256>"}}`.
   * Backend rejects with "Invalid code and user email" when the ticket
   * isn't bound to the bearer's email.
   */
  async getSkipLiabilityCode(codeValue: string): Promise<string> {
    const raw = await network().get<{
      data: { data?: string } | string | null;
    }>('/codes/skip-liability-code', { params: { code_value: codeValue } });
    const d = raw.data;
    if (typeof d === 'string') return d;
    return String(d?.data ?? '');
  },

  /**
   * GET /codes/estimate/change-course — preview fee for changing course.
   * ⚠️ PROBE LIVE: backend may 403 empty body (endpoint doesn't exist).
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
   * ⚠️ PROBE LIVE: see estimate above.
   * BR-CHECKOUT-26: validate new course min_age vs athlete dob at event date.
   */
  /**
   * PUT /codes/change-course — performs the course change AND, when there is
   * a fee gap, creates a delta-fee ORDER server-side (web contract verified
   * in selling-web payment-screen.tsx: `orderId = res.data.data.id` →
   * getCheckoutURL(orderId) → gateway redirect). Returns that orderId so the
   * caller can route to payment; null when backend returns no order (free
   * change).
   */
  async changeCourse(input: {
    codeValue: string;
    toCourseId: string;
    payload: Record<string, unknown>;
  }): Promise<{ orderId: string | null }> {
    const raw = await network().put<{
      data?: { id?: number | string } | null;
    }>('/codes/change-course', input.payload, {
      params: {
        code_value: input.codeValue,
        to_course_id: input.toCourseId,
      },
      noRetry: true,
    });
    const oid = raw?.data?.id;
    return { orderId: oid != null ? String(oid) : null };
  },
};
