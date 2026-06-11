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

/** Sign-screen context distilled from /pub/ticket-by-code/{secret}. */
export interface WaiverSignContext {
  codeValue: string;
  /** `code_athlete_status` — backend uses CHECKEDIN (no underscore) here. */
  status: string;
  checkinEndTime?: string;
  delegationEnabled: boolean;
  raceTitle: string;
  courseName: string;
  qrImage?: string;
  bib?: string;
  athlete: {
    name: string;
    email: string;
    gender: string;
    dob: string;
    contactPhone: string;
    sosPhone: string;
    idNumber: string;
    nationality: string;
    racekit: string;
    address: string;
    medicalInfo: string;
  };
  guardian?: {
    name: string;
    email: string;
    dob: string;
    relationship: string;
    phone: string;
    cardId: string;
  };
}

/**
 * Replace waiver-template merge tags with athlete data — EXACT web parity
 * (check-in read-html.tsx replaceAll list). The filled HTML is what gets
 * POSTed to the sign endpoint; backend renders it to the S3 PDF, so missing
 * replacement = raw `*|tag|*` artifacts in the legal document.
 *
 * `eSign` is the uploaded signature image URL + timestamp; web embeds
 * `<img width=200 height=200 src=…/>` + the ISO timestamp under it.
 */
export function fillWaiverTemplate(
  template: string,
  ctx: WaiverSignContext,
  eSign?: { url: string; signedAtIso: string },
): string {
  const sig = eSign
    ? `<img width=200 height=200 src=${eSign.url} /><br /><span style="font-size:12px;color:#475467;">${eSign.signedAtIso}</span>`
    : '';
  const a = ctx.athlete;
  const g = ctx.guardian;
  const rep = (s: string, tag: string, value: string | undefined) =>
    s.split(`*|${tag}|*`).join(value ?? '');
  let out = template;
  out = rep(out, 'registerName', a.name);
  out = rep(out, 'email', a.email);
  out = rep(out, 'distance', ctx.courseName);
  out = rep(out, 'gender', a.gender);
  out = rep(out, 'sos', a.sosPhone);
  out = rep(out, 'idpp', a.idNumber);
  out = rep(out, 'dob', a.dob);
  out = rep(out, 'phone', a.contactPhone);
  out = rep(out, 'sosPhone', a.sosPhone);
  out = rep(out, 'e-sign', `${sig} `);
  out = rep(out, 'national', a.nationality);
  out = rep(out, 'address', a.address);
  out = rep(out, 'racekit', a.racekit);
  out = rep(out, 'medical', a.medicalInfo);
  out = rep(out, 'bib', ctx.bib);
  out = rep(out, 'guardianName', g?.name);
  out = rep(out, 'guardianEmail', g?.email);
  out = rep(out, 'guardianDob', g?.dob);
  out = rep(out, 'guardianRelationship', g?.relationship);
  out = rep(out, 'guardianPhone', g?.phone);
  out = rep(out, 'guardianId', g?.cardId);
  return out;
}

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
   *
   * ⚠️ Verified live 2026-06-11 (race 257): response is DOUBLE-nested and
   * carries an S3 *URL*, not inline HTML:
   *   {data:{data:"https://...s3.../xxx.html"}}
   * The real template must be fetched from that URL. The inline-string
   * shape is tolerated too in case other races/envs return HTML directly —
   * the old code assumed inline-only and crashed NativeSignFlow with
   * "html.replace is not a function".
   */
  async getWaiverTemplate(raceId: string): Promise<string> {
    const raw = await network().get<
      { data: string | { data?: string } } | string
    >('/pub/race-skip-all-liability-html', { params: { race_id: raceId } });
    let v: unknown = typeof raw === 'string' ? raw : raw.data;
    if (v && typeof v === 'object') {
      v = (v as { data?: string }).data ?? '';
    }
    if (typeof v !== 'string' || !v) return '';
    if (/^https?:\/\//i.test(v)) {
      const res = await fetch(v);
      if (!res.ok) throw new Error(`waiver template fetch ${res.status}`);
      return await res.text();
    }
    return v;
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
   * Typed context for the native sign screen, built from
   * GET /pub/ticket-by-code/{secret} (verified live 2026-06-11, race 575).
   *
   * Carries everything the web check-in flow uses:
   *   - athlete_basic_info.athlete_sub_info → merge-tag data + prefill
   *   - athlete_basic_info.code_athlete_status → CHECKEDIN early-exit
   *   - race.checkin_end_time → time gate (web: ConnectTimeOut screen)
   *   - race_extenstion.enable_delegation_skip_liabilty → delegation radio
   */
  async getSignContext(secretCode: string): Promise<WaiverSignContext> {
    const raw = await network().get<{ data: Record<string, any> }>(
      `/pub/ticket-by-code/${secretCode}`,
    );
    const d = raw.data ?? {};
    const abi = d.athlete_basic_info ?? {};
    const sub = abi.athlete_sub_info ?? {};
    const rep = abi.athlete_represent ?? {};
    const race = d.race ?? {};
    const ext = race.race_extenstion ?? race.race_extension ?? {};
    const basic = d.basic_info ?? {};
    return {
      codeValue: String(d.value ?? basic.value ?? ''),
      status: String(abi.code_athlete_status ?? d.athlete_status ?? ''),
      checkinEndTime: race.checkin_end_time as string | undefined,
      delegationEnabled: Boolean(ext.enable_delegation_skip_liabilty ?? false),
      raceTitle: String(race.title ?? basic.race_name ?? ''),
      courseName: String(basic.course_name ?? ''),
      qrImage: d.qr_image as string | undefined,
      bib: abi.bib != null ? String(abi.bib) : undefined,
      athlete: {
        name:
          sub.first_name && sub.last_name
            ? `${sub.first_name} ${sub.last_name}`
            : (sub.name ?? ''),
        email: sub.email ?? d.receipt_email ?? '',
        gender: sub.gender ?? '',
        dob: sub.dob ?? '',
        contactPhone: sub.contact_phone ?? '',
        sosPhone: sub.sos_phone ?? '',
        idNumber: sub.id_number ?? '',
        nationality: sub.nationality ?? '',
        racekit: sub.racekit ?? '',
        address: sub.address ?? '',
        medicalInfo: sub.medical_info ?? '',
      },
      guardian: rep?.guardian_name
        ? {
            name: rep.guardian_name ?? '',
            email: rep.guardian_email ?? '',
            dob: rep.guardian_dob ?? '',
            relationship: rep.guardian_relationship ?? '',
            phone: rep.guardian_phone_number ?? '',
            cardId: rep.guardian_card_id ?? '',
          }
        : undefined,
    };
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
