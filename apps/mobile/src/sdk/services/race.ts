/**
 * apps/mobile/src/sdk/services/race.ts
 *
 * Race / event browsing service. Consumer sees CLEAN shape (camelCase).
 * Internal: legacy backend shape (snake_case query params, mixed body).
 *
 * Source: docs/API_REFERENCE.md "EPIC-2 Browsing (Race Detail)".
 */
import { network } from '../core';
import type { ListRacesResponse, Race } from '../models';

export interface ListRacesParams {
  pageNo?: number;
  pageSize?: number;
  sortField?: string;
  sortDirection?: 'ASC' | 'DESC';
  status?: string;
  title?: string;
  raceType?: string;
  isHighlight?: boolean;
  bibSetUp?: boolean;
}

interface LegacyListRacesParams {
  pageNo?: number;
  pageSize?: number;
  sortField?: string;
  sortDirection?: 'ASC' | 'DESC';
  status?: string;
  title?: string;
  race_type?: string;
  is_highlight?: boolean;
  bib_set_up?: boolean;
}

/** Convert clean param shape → legacy backend SNAKE_CASE query params.
 * Backend verified 2026-05-27: returns 400 "Mismatch request param" for camelCase. */
function toLegacyListParams(p: ListRacesParams): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.pageNo !== undefined) out.page_no = p.pageNo;
  if (p.pageSize !== undefined) out.page_size = p.pageSize;
  if (p.sortField !== undefined) out.sort_field = p.sortField;
  if (p.sortDirection !== undefined) out.sort_direction = p.sortDirection;
  if (p.status !== undefined) out.status = p.status;
  if (p.title !== undefined) out.title = p.title;
  if (p.raceType !== undefined) out.race_type = p.raceType;
  if (p.isHighlight !== undefined) out.is_highlight = p.isHighlight;
  if (p.bibSetUp !== undefined) out.bib_set_up = p.bibSetUp;
  return out;
}

/**
 * Pass-through normalize: backend race shape is rich and partially camelCase
 * already. We coerce id to string and surface common alias fields. Mobile
 * consumers should treat `unknown` fields with optional access (`race.xyz?.`).
 * TODO: tighten Race model fields as screens are built.
 */
function normalizeRace(raw: unknown): Race {
  const r = (raw ?? {}) as Record<string, unknown>;
  // Real backend shape (verified 2026-05-27 via /pub/by-slug):
  //   - Cover image: top-level `images` (string URL) OR `logo_url` OR
  //     nested `race_extenstion.banner`. NEVER `banner_url`/`cover_image_url`
  //     (those are mobile-fiction).
  //   - Start date: `event_start_date` (snake), NOT `race_date`/`start_date`.
  //   - `is_highlight` lives under nested `race_extenstion` (sic — backend typo),
  //     not at top level.
  //   - Courses are NEVER embedded — must fetch via `/pub/race-course?race_id=X`.
  const ext = (r.race_extenstion ?? r.race_extension ?? {}) as Record<
    string,
    unknown
  >;
  return {
    id: String(r.id ?? r.race_id ?? ''),
    slug: String(r.slug ?? ext.slug ?? ''),
    title: String(r.title ?? r.name ?? ''),
    description: r.description as string | undefined,
    coverImageUrl:
      (r.banner_url as string | null | undefined) ??
      (r.bannerUrl as string | null | undefined) ??
      (r.cover_image_url as string | null | undefined) ??
      (r.coverImageUrl as string | null | undefined) ??
      (r.images as string | null | undefined) ??
      (ext.banner as string | null | undefined) ??
      (r.logo_url as string | null | undefined) ??
      null,
    startDate: String(
      r.event_start_date ??
        r.race_date ??
        r.raceDate ??
        r.start_date ??
        r.startDate ??
        '',
    ),
    endDate:
      (r.event_end_date as string | undefined) ??
      (r.end_date as string | undefined) ??
      (r.endDate as string | undefined),
    location: r.location as string | undefined,
    city: r.city as string | undefined,
    isHighlight: Boolean(
      r.is_highlight ?? r.isHighlight ?? ext.is_highlight ?? false,
    ),
    bibSetUp: Boolean(r.bib_set_up ?? r.bibSetUp ?? false),
    status: (r.status as Race['status']) ?? 'COMING_SOON',
    raceType: (r.race_type as string | undefined) ?? (r.raceType as string | undefined),
    courses: r.courses as Race['courses'],
    schedule: r.schedule as Race['schedule'],
    racekitImages: r.racekit_images as string[] | undefined,
    latitude: (r.latitude as number | undefined) ?? (r.event_lat as number | undefined),
    longitude: (r.longitude as number | undefined) ?? (r.event_lng as number | undefined),
  };
}

export const race = {
  /**
   * GET /pub/race — paginated list of races.
   */
  async listRaces(params: ListRacesParams = {}): Promise<ListRacesResponse> {
    const legacy = toLegacyListParams(params);
    const raw = await network().get<{
      data: {
        list: unknown[];
        totalPages: number;
        currentPage: number;
        pageSize?: number;
        totalCount?: number;
      };
    }>('/pub/race', { params: legacy as Record<string, unknown> });

    return {
      items: (raw.data.list ?? []).map(normalizeRace),
      pagination: {
        currentPage: raw.data.currentPage,
        totalPages: raw.data.totalPages,
        pageSize: raw.data.pageSize ?? params.pageSize ?? 10,
        totalCount: raw.data.totalCount,
      },
    };
  },

  /**
   * GET /pub/race-by-id?race_id=X&is_detail=true — race detail by numeric ID.
   * `is_detail=true` REQUIRED to fetch full data (description, terms, courses).
   */
  async getRaceById(id: string, isDetail = true): Promise<Race> {
    const raw = await network().get<{ data: unknown }>('/pub/race-by-id', {
      params: { race_id: id, is_detail: isDetail },
    });
    return normalizeRace(raw.data);
  },

  /**
   * GET /pub/by-slug?slug=... — mobile preferred for deep links (`/race/[slug]`).
   */
  async getRaceBySlug(slug: string, isDetail = true): Promise<Race> {
    const raw = await network().get<{ data: unknown }>('/pub/by-slug', {
      params: { slug, is_detail: isDetail },
    });
    return normalizeRace(raw.data);
  },

  /**
   * GET /pub/simple-course?race_ids=X,Y,Z — bulk fetch minimal course info
   * for multiple races. Comma-sep ids in the query.
   */
  async getSimpleCourses(raceIds: string[]): Promise<unknown[]> {
    if (raceIds.length === 0) return [];
    const raw = await network().get<{ data: unknown[] | { list?: unknown[] } }>(
      '/pub/simple-course',
      { params: { race_ids: raceIds.join(',') } },
    );
    if (Array.isArray(raw.data)) return raw.data;
    return raw.data?.list ?? [];
  },

  /**
   * GET /pub/race-listed-vnpay — races with VNPay configured (mobile payable).
   */
  async listVnpayRaces(): Promise<unknown[]> {
    const raw = await network().get<{ data: unknown[] | { list?: unknown[] } }>(
      '/pub/race-listed-vnpay',
    );
    if (Array.isArray(raw.data)) return raw.data;
    return raw.data?.list ?? [];
  },
};
