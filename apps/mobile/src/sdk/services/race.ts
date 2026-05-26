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

/** Convert clean param shape → legacy backend snake_case query params. */
function toLegacyListParams(p: ListRacesParams): LegacyListRacesParams {
  return {
    pageNo: p.pageNo,
    pageSize: p.pageSize,
    sortField: p.sortField,
    sortDirection: p.sortDirection,
    status: p.status,
    title: p.title,
    race_type: p.raceType,
    is_highlight: p.isHighlight,
    bib_set_up: p.bibSetUp,
  };
}

/**
 * Pass-through normalize: backend race shape is rich and partially camelCase
 * already. We coerce id to string and surface common alias fields. Mobile
 * consumers should treat `unknown` fields with optional access (`race.xyz?.`).
 * TODO: tighten Race model fields as screens are built.
 */
function normalizeRace(raw: unknown): Race {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? r.race_id ?? ''),
    slug: String(r.slug ?? ''),
    title: String(r.title ?? r.name ?? ''),
    description: r.description as string | undefined,
    coverImageUrl:
      (r.banner_url as string | null | undefined) ??
      (r.bannerUrl as string | null | undefined) ??
      (r.cover_image_url as string | null | undefined) ??
      (r.coverImageUrl as string | null | undefined) ??
      null,
    startDate: String(r.race_date ?? r.raceDate ?? r.start_date ?? r.startDate ?? ''),
    endDate: (r.end_date as string | undefined) ?? (r.endDate as string | undefined),
    location: r.location as string | undefined,
    city: r.city as string | undefined,
    isHighlight: Boolean(r.is_highlight ?? r.isHighlight ?? false),
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
