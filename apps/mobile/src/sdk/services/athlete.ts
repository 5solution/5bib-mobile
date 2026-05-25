/**
 * apps/mobile/src/sdk/services/athlete.ts
 *
 * Athlete service — registration, check-in, profile by ticket, results.
 *
 * Source: 01-ba-prd-epic-3-checkout.md, 01-ba-prd-epic-4-tickets.md,
 * 01-ba-prd-epic-5-result.md
 */
import { network } from '../core';
import type { AthleteCreatePayload, MyResultItem, Pagination } from '../models';

export interface ListResultsResponse {
  items: MyResultItem[];
  pagination: Pagination;
}

export const athlete = {
  /**
   * GET /athlete/by-ticket-code?code_value=...
   */
  async getAthleteByTicketCode(ticketCode: string): Promise<unknown> {
    const raw = await network().get<{ data: unknown }>(
      '/athlete/by-ticket-code',
      { params: { code_value: ticketCode } },
    );
    // TODO: implement athlete normalizer (snake_case → camelCase)
    return raw.data;
  },

  /**
   * POST /athlete/register?code_value=... — submit athlete info for a ticket.
   * TODO: map clean AthleteCreatePayload → legacy backend shape
   * (port web `mapFormDataToPayload`: sosPhone composition, name composition,
   * nested guardian fields with `guardian_` prefix).
   */
  async registerAthlete(input: {
    codeValue: string;
    athlete: AthleteCreatePayload;
  }): Promise<void> {
    // TODO: extract `mapAthleteToLegacy` shared util
    await network().post('/athlete/register', mapAthleteToLegacy(input.athlete), {
      params: { code_value: input.codeValue },
      noRetry: true,
    });
  },

  /**
   * POST /athlete/register/represent — register as delegator.
   */
  async registerRepresent(input: {
    codeValue: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    // TODO: map clean payload → legacy
    await network().post('/athlete/register/represent', input.payload, {
      params: { code_value: input.codeValue },
      noRetry: true,
    });
  },

  /**
   * POST /athlete/checkin?code_value=... — staff check-in flow.
   */
  async checkIn(codeValue: string): Promise<void> {
    await network().post('/athlete/checkin', null, {
      params: { code_value: codeValue },
      noRetry: true,
    });
  },

  /**
   * GET /athlete/result — user's personal race results (paginated).
   */
  async getMyResults(input: {
    sortDirection?: 'ASC' | 'DESC';
    pageNo?: number;
    pageSize?: number;
  } = {}): Promise<ListResultsResponse> {
    const { sortDirection = 'DESC', pageNo = 1, pageSize = 10 } = input;
    const raw = await network().get<{
      data: {
        list: unknown[];
        totalPages: number;
        currentPage: number;
        totalCount?: number;
      };
    }>('/athlete/result', {
      params: { sortDirection, pageNo, pageSize },
    });
    // TODO: implement result normalizer
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
   * GET /athlete/story-image — share-card image for social.
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
    // TODO: confirm response shape — web returns whole envelope, mobile needs URL
    return typeof raw.data === 'string'
      ? raw.data
      : (raw.data?.url ?? '');
  },

  /**
   * GET /athlete/bib-image — share BIB image.
   */
  async getBibImage(input: {
    athleteId: string;
    code: string;
    isFb?: boolean;
  }): Promise<string> {
    const raw = await network().get<{ data: { url?: string } | string }>(
      '/athlete/bib-image',
      {
        params: {
          athlete_id: input.athleteId,
          code: input.code,
          is_fb: input.isFb ?? false,
        },
      },
    );
    return typeof raw.data === 'string'
      ? raw.data
      : (raw.data?.url ?? '');
  },

  /**
   * PUT /athlete/simple-edit?athlete_id=... — partial profile update.
   */
  async simpleEditAthlete(input: {
    athleteId: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    // TODO: normalize payload shape
    await network().put('/athlete/simple-edit', input.payload, {
      params: { athlete_id: input.athleteId },
    });
  },
};

/**
 * Internal: clean AthleteCreatePayload → legacy backend shape.
 * Port from web `services/athlete/index.ts` `mapFormDataToPayload`.
 * TODO: complete this mapper — emergency contact format,
 * guardian field prefixes, racekit value vs object.
 */
function mapAthleteToLegacy(a: AthleteCreatePayload): Record<string, unknown> {
  return {
    first_name: a.firstName,
    last_name: a.lastName,
    name: `${a.firstName} ${a.lastName}`,
    email: a.email.trim().toLowerCase(),
    contact_phone: a.phone,
    dob: a.dob,
    gender: a.gender,
    nationality: a.nationality,
    id_number: a.idNumber,
    tshirt_size: a.tshirtSize,
    racekit: a.racekit,
    name_on_bib: a.nameOnBib,
    // Web format: "<phone>-<name>" — confirm backend still expects this.
    sosPhone: `${a.emergencyContactPhone}-${a.emergencyContactName}`,
    blood_type: a.bloodType ?? '',
    medical_info: a.medicalInformation ?? '',
    current_medication: a.currentMedication ?? '',
    address: a.address ?? '',
    club: a.club ?? '',
    achievements: a.achievements ?? '',
  };
}
