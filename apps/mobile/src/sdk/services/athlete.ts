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
    dob: a.dob,
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
  return {
    id: String(r.id ?? r.athlete_id ?? ''),
    email: r.email as string | undefined,
    name: r.name as string | undefined,
    firstName: (r.first_name as string | undefined) ?? (r.firstName as string | undefined),
    lastName: (r.last_name as string | undefined) ?? (r.lastName as string | undefined),
    contactPhone: (r.contact_phone as string | undefined) ?? (r.contactPhone as string | undefined),
    idNumber: (r.id_number as string | undefined) ?? (r.idNumber as string | undefined),
    nationality: r.nationality as string | undefined,
    cityProvince: (r.city_province as string | undefined) ?? (r.cityProvince as string | undefined),
    gender: r.gender as Athlete['gender'],
    dob: r.dob as string | undefined,
    racekit: r.racekit as string | undefined,
    sosPhone: (r.sosPhone as string | undefined) ?? (r.sos_phone as string | undefined),
    club: r.club as string | undefined,
    nameOnBib: (r.name_on_bib as string | undefined) ?? (r.nameOnBib as string | undefined),
    medicalInfo: (r.medical_info as string | undefined) ?? (r.medicalInfo as string | undefined),
    currentMedication:
      (r.current_medication as string | undefined) ?? (r.currentMedication as string | undefined),
    isRepresent: Boolean(r.is_represent ?? r.isRepresent ?? false),
    bib: r.bib as string | undefined,
    disclaimerStatus: r.disclaimer_status as boolean | undefined,
  };
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
   * GET /athlete/bib-image?athlete_id=X&is_fb=BOOL — share-card BIB image.
   * `is_fb=true` returns FB-optimized variant.
   */
  async getBibImage(athleteId: string, isFb: boolean = false): Promise<string> {
    const raw = await network().get<{ data: { url?: string } | string }>(
      '/athlete/bib-image',
      { params: { athlete_id: athleteId, is_fb: isFb } },
    );
    return typeof raw.data === 'string' ? raw.data : (raw.data?.url ?? '');
  },

  /**
   * GET /athlete/story-image?athlete_id=X&code=Y&is_fb=BOOL — share story image.
   */
  async getStoryImage(input: {
    athleteId: string;
    code: string;
    isFb?: boolean;
  }): Promise<string> {
    const raw = await network().get<{ data: { url?: string } | string }>(
      '/athlete/story-image',
      {
        params: {
          athlete_id: input.athleteId,
          code: input.code,
          is_fb: input.isFb ?? false,
        },
      },
    );
    return typeof raw.data === 'string' ? raw.data : (raw.data?.url ?? '');
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
};
