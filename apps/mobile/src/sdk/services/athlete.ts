/**
 * apps/mobile/src/sdk/services/athlete.ts
 *
 * Athlete service — registration, check-in, profile by ticket, BIB image,
 * medals, transfer, rolling-BIB.
 *
 * Source: docs/API_REFERENCE.md "EPIC-4 Tickets / BIB / Athlete".
 *         01-ba-prd-epic-3-checkout.md, 01-ba-prd-epic-4-tickets.md,
 *         01-ba-prd-epic-5-result.md
 */
import { network } from '../core';
import { toDDMMYYYY, toIsoDate } from '../../utils/date';
import type {
  Athlete,
  AthleteCreatePayload,
  MedalItem,
  MyResultItem,
  Pagination,
} from '../models';

export interface ListResultsResponse {
  items: MyResultItem[];
  pagination: Pagination;
}

type BackendGender = 'MALE' | 'FEMALE' | 'UNKNOWN';

function toBackendGender(g: string): BackendGender {
  const v = g.toUpperCase();
  if (v === 'MALE' || v === 'FEMALE' || v === 'UNKNOWN') return v;
  if (v === 'OTHER') return 'UNKNOWN';
  return 'UNKNOWN';
}

/**
 * Clean AthleteCreatePayload → backend `/athlete/register` body.
 * Send BOTH `sosPhone` (camel) AND `sos_phone` (snake) for safety —
 * matches the EPIC-4 register schema in API_REFERENCE.
 */
function mapAthleteToLegacy(
  a: AthleteCreatePayload,
  isRepresent: boolean = false,
): Record<string, unknown> {
  const fullName = `${a.firstName} ${a.lastName}`.trim();
  return {
    email: a.email.trim().toLowerCase(),
    name: fullName,
    first_name: a.firstName,
    last_name: a.lastName,
    contact_phone: a.phone,
    id_number: a.idNumber,
    idpp: a.idNumber, // backend accepts ID passport (or CCCD again)
    nationality: a.nationality,
    gender: toBackendGender(a.gender),
    // Wire format DD/MM/YYYY — backend's LocalDate pattern (verified live
    // 2026-06-11: ISO → 400 "could not be parsed at index 2"). Web converts
    // via formatDateToDDMMYYYY before every athlete write.
    dob: toDDMMYYYY(a.dob),
    address: a.address ?? '',
    racekit: a.racekit,
    sosPhone: `${a.emergencyContactPhone}-${a.emergencyContactName}`,
    sos_phone: `${a.emergencyContactPhone}-${a.emergencyContactName}`,
    club: a.club ?? '',
    name_on_bib: a.nameOnBib,
    medical_info: a.medicalInformation ?? '',
    current_medication: a.currentMedication ?? '',
    blood_type: a.bloodType ?? '',
    achievements: a.achievements ?? '',
    athlete_represent: {},
    disclaimer_status: false,
    is_represent: isRepresent,
    customize_fields: null,
  };
}

function normalizeAthlete(raw: unknown): Athlete {
  const r = (raw ?? {}) as Record<string, unknown>;
  // ⚠️ Verified live 2026-06-11 (/athlete/by-ticket-code, athlete 11251):
  // the EDITABLE record lives in nested `athlete_sub_info` — first_name,
  // contact_phone, racekit (= t-shirt size), name_on_bib, club, medical_info,
  // sos_phone, blood_type, address are ONLY there. The top level carries id,
  // statuses, and an id-card copy of dob/gender. Read sub_info first.
  const si = (r.athlete_sub_info ?? {}) as Record<string, unknown>;
  const pick = (k: string) =>
    (si[k] as string | undefined) ?? (r[k] as string | undefined);
  return {
    // simple-edit wants the TOP-LEVEL athlete id (web: res_athlete.data.data.id).
    id: String(r.id ?? r.athlete_id ?? ''),
    email: pick('email'),
    name: pick('name'),
    firstName: pick('first_name') ?? (r.firstName as string | undefined),
    lastName: pick('last_name') ?? (r.lastName as string | undefined),
    contactPhone: pick('contact_phone') ?? (r.contactPhone as string | undefined),
    idNumber: pick('id_number') ?? (r.idpp as string | undefined),
    nationality: pick('nationality'),
    cityProvince: pick('city_province'),
    gender: (si.gender ?? r.gender) as Athlete['gender'],
    // Stored dob is a mixed bag: "09/08/1997" (web-created) vs "1997-08-09"
    // (ISO). Canonicalize to ISO; screens re-format for display/wire.
    dob: toIsoDate(pick('dob')) || undefined,
    racekit: pick('racekit'),
    sosPhone: pick('sosPhone') ?? pick('sos_phone'),
    club: pick('club'),
    nameOnBib: pick('name_on_bib') ?? (r.nameOnBib as string | undefined),
    medicalInfo: pick('medical_info'),
    currentMedication: pick('current_medication'),
    bloodType: pick('blood_type'),
    address: pick('address'),
    isRepresent: Boolean(si.is_represent ?? r.is_represent ?? false),
    delegatorName: pick('delegator_name'),
    delegatorEmail: pick('delegator_email'),
    delegatorPhone: pick('delegator_phone'),
    delegatorCccd: pick('delegator_cccd'),
    bib: (r.bib ?? r.bib_number) as string | undefined,
    disclaimerStatus: (si.disclaimer_status ?? r.disclaimer_status) as
      | boolean
      | undefined,
  };
}

/**
 * Unwrap the share-image payload. Wire is double-nested {data:{data:<img>}}
 * — same envelope as the payment endpoints (web's share-bib-modal reads
 * `res?.data?.data?.data`). The old `raw.data?.url` reader never matched, so
 * Share BIB silently degraded to text-only. Walks `data` links and accepts
 * a string (URL or data-URI) or legacy `{url}` at any level.
 */
function unwrapImagePayload(body: unknown): string {
  let cur: unknown = body;
  for (let depth = 0; depth < 4 && cur != null; depth++) {
    if (typeof cur === 'string') return cur;
    if (typeof cur !== 'object') return '';
    const o = cur as Record<string, unknown>;
    if (typeof o.url === 'string') return o.url;
    cur = o.data;
  }
  return '';
}

export const athlete = {
  /**
   * POST /athlete/register?code_value=X — claim a ticket by registering
   * athlete info. EPIC-4 main flow.
   */
  async registerAthlete(
    codeValue: string,
    payload: AthleteCreatePayload,
  ): Promise<void> {
    await network().post(
      '/athlete/register',
      mapAthleteToLegacy(payload, false),
      {
        params: { code_value: codeValue },
        noRetry: true,
      },
    );
  },

  /**
   * POST /athlete/register/represent?code_value=X — register for someone else.
   * Sets `is_represent=true` + populates `athlete_represent`.
   */
  async registerRepresent(
    codeValue: string,
    payload: AthleteCreatePayload,
  ): Promise<void> {
    await network().post(
      '/athlete/register/represent',
      mapAthleteToLegacy(payload, true),
      {
        params: { code_value: codeValue },
        noRetry: true,
      },
    );
  },

  /**
   * POST /athlete/transfer?code_value=X&receipt_email=Y — transfer ticket.
   * BR-TICKETS-20: 8 possible error codes (mapped in transfer-error-codes.ts).
   */
  async transferTicket(
    codeValue: string,
    receiptEmail: string,
    message?: string,
  ): Promise<void> {
    await network().post(
      '/athlete/transfer',
      { message: message ?? '' },
      {
        params: {
          code_value: codeValue,
          receipt_email: receiptEmail.trim().toLowerCase(),
        },
        noRetry: true,
      },
    );
  },

  /**
   * POST /athlete/checkin?code_value=X — race-day check-in (no body).
   */
  async checkin(codeValue: string): Promise<void> {
    await network().post('/athlete/checkin', null, {
      params: { code_value: codeValue },
      noRetry: true,
    });
  },

  /**
   * PUT /athlete/rolling-bib?course_id=X&code=Y&confirmed=BOOL — rolling-BIB
   * gamification: randomly assign BIB number.
   *   - confirmed=false: preview (rolls but not commit)
   *   - confirmed=true: commit assignment
   */
  async rollingBib(
    courseId: string,
    code: string,
    confirmed: boolean,
  ): Promise<unknown> {
    const raw = await network().put<{ data: unknown }>(
      '/athlete/rolling-bib',
      null,
      {
        params: { course_id: courseId, code, confirmed },
        noRetry: true,
      },
    );
    return raw.data;
  },

  /**
   * GET /athlete/by-ticket-code?code_value=X — lookup athlete info by ticket.
   */
  async getAthleteByTicketCode(codeValue: string): Promise<Athlete | null> {
    const raw = await network().get<{ data: unknown }>(
      '/athlete/by-ticket-code',
      { params: { code_value: codeValue } },
    );
    return raw.data ? normalizeAthlete(raw.data) : null;
  },

  /**
   * GET /athlete/bib-image?athlete_id=X&code=Y&is_fb=BOOL — share-card BIB
   * image. `is_fb=true` returns FB-optimized variant. Web sends the ticket
   * `code` alongside athlete_id (share-bib-modal.tsx) — pass it when known.
   */
  async getBibImage(
    athleteId: string,
    isFb: boolean = false,
    code?: string,
  ): Promise<string> {
    const raw = await network().get<unknown>('/athlete/bib-image', {
      params: {
        athlete_id: athleteId,
        is_fb: isFb,
        ...(code ? { code } : {}),
      },
    });
    return unwrapImagePayload(raw);
  },

  /**
   * GET /athlete/story-image?athlete_id=X&code=Y&is_fb=BOOL — share story image.
   */
  async getStoryImage(input: {
    athleteId: string;
    code: string;
    isFb?: boolean;
  }): Promise<string> {
    const raw = await network().get<unknown>('/athlete/story-image', {
      params: {
        athlete_id: input.athleteId,
        code: input.code,
        is_fb: input.isFb ?? false,
      },
    });
    return unwrapImagePayload(raw);
  },

  /**
   * GET /athlete/all-medals — user's medal collection across all races.
   */
  async getMyMedals(): Promise<MedalItem[]> {
    const raw = await network().get<{
      data: unknown[] | { list?: unknown[] };
    }>('/athlete/all-medals');
    const list = Array.isArray(raw.data) ? raw.data : (raw.data?.list ?? []);
    return list.map((m): MedalItem => {
      const r = (m ?? {}) as Record<string, unknown>;
      return {
        id: String(r.id ?? ''),
        raceId: r.race_id != null ? String(r.race_id) : undefined,
        imageUrl: String(r.image_url ?? r.imageUrl ?? r.url ?? ''),
        earnedAt:
          (r.earned_at as string | undefined) ??
          (r.earnedAt as string | undefined),
        raceName: (r.race_name as string | undefined) ?? (r.raceName as string | undefined),
      };
    });
  },

  /**
   * GET /athlete/result — user's personal race results (paginated).
   */
  async getMyResults(
    input: {
      sortDirection?: 'ASC' | 'DESC';
      pageNo?: number;
      pageSize?: number;
    } = {},
  ): Promise<ListResultsResponse> {
    const { sortDirection = 'DESC', pageNo = 1, pageSize = 10 } = input;
    const raw = await network().get<{
      data: {
        list: unknown[];
        totalPages: number;
        currentPage: number;
        totalCount?: number;
      };
    }>('/athlete/result', {
      // snake_case per backend convention.
      params: { sort_direction: sortDirection, page_no: pageNo, page_size: pageSize },
    });
    // TODO: implement result normalizer in normalize/ when screens demand it
    return {
      items: (raw.data.list as MyResultItem[]) ?? [],
      pagination: {
        currentPage: raw.data.currentPage,
        totalPages: raw.data.totalPages,
        pageSize,
        totalCount: raw.data.totalCount,
      },
    };
  },

  /**
   * PUT /athlete/simple-edit?athlete_id=X — partial profile update.
   * ⚠️ TBD which is canonical vs `/athlete/update/{id}` — probe live.
   */
  async simpleEdit(input: {
    athleteId: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    await network().put('/athlete/simple-edit', input.payload, {
      params: { athlete_id: input.athleteId },
      noRetry: true,
    });
  },

  /**
   * GET /pub/athlete/basic/adv — public registered-athletes roster for an
   * event (web parity: "Danh sách vận động viên" tab, G-12).
   *
   * No auth required. Verified live 2026-06-11 on race 257 (574 athletes):
   *   - `name` filters by athlete name (web search box "Tên hoặc số BIB")
   *   - `course_ids` filters by course (web's 12KM/21km/42KM chips)
   *   - camelCase pageNo/pageSize (same convention as /order, /codes/me)
   *   - response: { totalPages, currentPage, totalItems, list: [...] }
   */
  async listPublicRoster(input: {
    raceId: string;
    courseId?: string;
    name?: string;
    pageNo?: number;
    pageSize?: number;
  }): Promise<{ items: PublicRosterAthlete[]; pagination: Pagination }> {
    const { raceId, courseId, name, pageNo = 1, pageSize = 10 } = input;
    const raw = await network().get<{
      data: {
        list: unknown[];
        totalPages: number;
        currentPage: number;
        totalItems?: number;
      };
    }>('/pub/athlete/basic/adv', {
      params: {
        race_id: raceId,
        ...(courseId ? { course_ids: courseId } : {}),
        ...(name ? { name } : {}),
        pageNo,
        pageSize,
      },
    });
    const items = (raw.data.list ?? []).map((r): PublicRosterAthlete => {
      const a = (r ?? {}) as Record<string, unknown>;
      return {
        name: String(a.name ?? ''),
        bibNumber: a.bib_number != null ? String(a.bib_number) : '',
        gender: String(a.gender ?? ''),
        courseName: String(a.course_name ?? ''),
        nationality: String(a.nationality ?? ''),
      };
    });
    return {
      items,
      pagination: {
        currentPage: raw.data.currentPage,
        totalPages: raw.data.totalPages,
        pageSize,
        totalCount: raw.data.totalItems,
      },
    };
  },
};

/** One row of the public event roster — deliberately minimal (public data). */
export interface PublicRosterAthlete {
  name: string;
  bibNumber: string;
  gender: string;
  courseName: string;
  nationality: string;
}
