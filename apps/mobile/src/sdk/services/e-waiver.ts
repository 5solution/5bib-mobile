/**
 * apps/mobile/src/sdk/services/e-waiver.ts
 *
 * E-Waiver / disclaimer signing service.
 * 3-step flow: race dropdown → request OTP → verify OTP → fetch ticket list.
 *
 * Source: 01-ba-prd-epic-6-ewaiver.md
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
   * POST /pub/signing-race-dropdown — list races available for signing.
   */
  async fetchSigningRaces(input: {
    pageNo?: number;
    pageSize?: number;
  } = {}): Promise<SigningRace[]> {
    const { pageNo = 1, pageSize = 100 } = input;
    const raw = await network().post<{
      data?: { content?: LegacySigningRace[] };
      success?: boolean;
    }>('/pub/signing-race-dropdown', undefined, {
      params: { pageNo, pageSize },
    });
    if (raw.success === false) {
      throw new Error('Failed to load signing races');
    }
    return (raw.data?.content ?? []).map(normalizeSigningRace);
  },

  /**
   * POST /pub/signing-request — request OTP for race signing.
   */
  async requestSigningOtp(input: {
    raceId: string;
    email: string;
  }): Promise<void> {
    await network().post(
      '/pub/signing-request',
      {
        race_id: Number(input.raceId),
        email: input.email.trim().toLowerCase(),
      },
      { noRetry: true },
    );
  },

  /**
   * POST /pub/signing-request-result — verify OTP, get signable tickets.
   */
  async verifySigningOtp(input: {
    raceId: string;
    email: string;
    otp: string;
  }): Promise<SigningTicket[]> {
    const raw = await network().post<{
      data?: LegacySigningTicket[];
      success?: boolean;
    }>(
      '/pub/signing-request-result',
      {
        race_id: Number(input.raceId),
        email: input.email.trim().toLowerCase(),
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
   * POST /pub/aggree-skip-liability/:code — submit signed HTML disclaimer.
   * Optional delegator block for adult-signing-for-minor flow.
   * Note: backend expects raw HTML body, NOT JSON.
   * TODO: confirm content-type override path with adapter.
   */
  async submitSignedDisclaimer(input: {
    codeValue: string;
    signedHtml: string;
    delegator?: {
      name: string;
      email: string;
      phone: string;
      cccd: string;
    };
  }): Promise<void> {
    const params = input.delegator
      ? {
          delegator_name: input.delegator.name,
          delegator_email: input.delegator.email,
          delegator_phone: input.delegator.phone,
          delegator_cccd: input.delegator.cccd,
        }
      : undefined;

    await network().post(
      `/pub/aggree-skip-liability/${input.codeValue}`,
      input.signedHtml,
      {
        headers: { 'Content-Type': 'text/html' },
        params,
        noRetry: true,
      },
    );
  },
};
