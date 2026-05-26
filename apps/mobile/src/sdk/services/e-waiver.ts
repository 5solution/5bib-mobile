/**
 * apps/mobile/src/sdk/services/e-waiver.ts
 *
 * E-Waiver / disclaimer signing service.
 * Flow: race dropdown → request OTP → verify OTP → fetch waiver HTML → sign.
 *
 * Source: docs/API_REFERENCE.md "EPIC-6 E-Waiver".
 *         01-ba-prd-epic-6-ewaiver.md
 *
 * ⚠️ Typo "aggree" in endpoint path — INTENTIONAL backend, KHÔNG fix.
 * ⚠️ Sign endpoint body is `text/html`, NOT JSON.
 */
import { network } from '../core';
import type { SigningRace, SigningTicket } from '../models';

interface LegacySigningRace {
  race_id: number;
  title: string;
}

interface LegacySigningTicket {
  id: number;
  name?: string;
  email?: string;
  code_value?: string;
  sign_path?: string;
  disclaimer_status?: boolean;
  athlete_sub_info?: {
    contact_phone?: string;
    dob?: string;
    disclaimer_status?: boolean;
  };
  course_info?: {
    race_name?: string;
    course_name?: string;
    ticket_image?: string;
  };
}

function normalizeSigningRace(r: LegacySigningRace): SigningRace {
  return { raceId: String(r.race_id), title: r.title };
}

function normalizeSigningTicket(t: LegacySigningTicket): SigningTicket {
  return {
    id: String(t.id),
    name: t.name,
    email: t.email,
    codeValue: t.code_value,
    signPath: t.sign_path,
    disclaimerStatus: t.disclaimer_status ?? false,
    athleteSubInfo: t.athlete_sub_info
      ? {
          contactPhone: t.athlete_sub_info.contact_phone,
          dob: t.athlete_sub_info.dob,
          disclaimerStatus: t.athlete_sub_info.disclaimer_status,
        }
      : undefined,
    courseInfo: t.course_info
      ? {
          raceName: t.course_info.race_name,
          courseName: t.course_info.course_name,
          ticketImage: t.course_info.ticket_image,
        }
      : undefined,
  };
}

export const eWaiver = {
  /**
   * POST /pub/signing-race-dropdown — list races eligible for waiver signing.
   * Body shape TBD per API_REFERENCE — Postman shows email/password (likely wrong).
   * Mobile must probe live. Current impl sends `{ email }` body — adapt if needed.
   */
  async getSigningRaces(input: {
    email: string;
    pageNo?: number;
    pageSize?: number;
  }): Promise<SigningRace[]> {
    const { email, pageNo = 1, pageSize = 100 } = input;
    const raw = await network().post<{
      data?: { content?: LegacySigningRace[] } | LegacySigningRace[];
      success?: boolean;
    }>(
      '/pub/signing-race-dropdown',
      { email: email.trim().toLowerCase() },
      { params: { pageNo, pageSize }, noRetry: true },
    );
    if (raw.success === false) {
      throw new Error('Failed to load signing races');
    }
    const data = raw.data;
    if (!data) return [];
    const list = Array.isArray(data) ? data : (data.content ?? []);
    return list.map(normalizeSigningRace);
  },

  /**
   * POST /pub/signing-request — send 6-digit OTP to email.
   * Body: snake_case race_id.
   */
  async sendSigningOtp(input: {
    email: string;
    raceId: string;
  }): Promise<void> {
    await network().post(
      '/pub/signing-request',
      {
        email: input.email.trim().toLowerCase(),
        race_id: Number(input.raceId),
      },
      { noRetry: true },
    );
  },

  /**
   * POST /pub/signing-request-result — verify OTP, return signable tickets.
   */
  async verifySigningOtp(input: {
    email: string;
    raceId: string;
    otp: string;
  }): Promise<SigningTicket[]> {
    const raw = await network().post<{
      data?: LegacySigningTicket[];
      success?: boolean;
    }>(
      '/pub/signing-request-result',
      {
        email: input.email.trim().toLowerCase(),
        race_id: Number(input.raceId),
        otp: input.otp,
      },
      { noRetry: true },
    );
    if (raw.success === false) {
      throw new Error('OTP verification failed');
    }
    return (raw.data ?? []).map(normalizeSigningTicket);
  },

  /**
   * GET /pub/race-skip-all-liability-html?race_id=X — waiver HTML template.
   * Returns full legal HTML for WebView display before user signs.
   */
  async getWaiverTemplate(raceId: string): Promise<string> {
    const raw = await network().get<{ data: string } | string>(
      '/pub/race-skip-all-liability-html',
      { params: { race_id: raceId } },
    );
    if (typeof raw === 'string') return raw;
    return raw.data ?? '';
  },

  /**
   * GET /pub/ticket-by-code/{secretCode} — lookup ticket by secret share link.
   * Used when user opens shared waiver link from email.
   */
  async getTicketBySecretCode(secretCode: string): Promise<unknown> {
    const raw = await network().get<{ data: unknown }>(
      `/pub/ticket-by-code/${secretCode}`,
    );
    return raw.data;
  },

  /**
   * POST /pub/aggree-skip-liability/{secretCode} 🔥 SIGN WAIVER.
   *
   * ⚠️ Body Content-Type is `text/html`, NOT JSON.
   * ⚠️ "aggree" typo INTENTIONAL — backend endpoint, do not fix.
   * ⚠️ Delegator params in QUERY (URL-encoded), not body.
   *
   * @param secretCode  Path param: `{athlete_id}-{long_hash}` format
   * @param htmlBody    Filled HTML waiver content
   * @param delegator   Optional adult-signing-for-minor delegator metadata
   */
  async signWaiver(
    secretCode: string,
    htmlBody: string,
    delegator?: { name: string; email: string; cccd: string; phone?: string },
  ): Promise<void> {
    const params = delegator
      ? {
          delegator_name: delegator.name,
          delegator_email: delegator.email.trim().toLowerCase(),
          delegator_cccd: delegator.cccd,
          ...(delegator.phone && { delegator_phone: delegator.phone }),
        }
      : undefined;

    await network().post(
      `/pub/aggree-skip-liability/${secretCode}`,
      htmlBody,
      {
        headers: { 'Content-Type': 'text/html' },
        params,
        noRetry: true,
      },
    );
  },
};
