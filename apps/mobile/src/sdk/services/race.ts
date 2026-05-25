/**
 * apps/mobile/src/sdk/services/race.ts
 *
 * Race / event browsing service. Backend list endpoint is `/pub/race`.
 * Detail endpoints support both ID and slug lookup.
 *
 * Source: 01-ba-prd-epic-2-browsing.md
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

export const race = {
  /**
   * GET /pub/race — paginated list of races.
   * TODO: confirm whether mobile needs ETag/cache headers (web uses
   * next.revalidate which is N/A for RN).
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

    // TODO: implement race normalizer (legacy snake_case → Race clean shape)
    return {
      items: (raw.data.list as Race[]) ?? [],
      pagination: {
        currentPage: raw.data.currentPage,
        totalPages: raw.data.totalPages,
        pageSize: raw.data.pageSize ?? params.pageSize ?? 10,
        totalCount: raw.data.totalCount,
      },
    };
  },

  /**
   * GET /pub/race-by-id?race_id=... — race detail by numeric ID.
   */
  async getRaceById(id: string, isDetail = true): Promise<Race> {
    const raw = await network().get<{ data: unknown }>('/pub/race-by-id', {
      params: { race_id: id, is_detail: isDetail },
    });
    // TODO: implement race normalizer
    return raw.data as Race;
  },

  /**
   * GET /pub/by-slug?slug=... — preferred for SEO / deep linking.
   */
  async getRaceBySlug(slug: string, isDetail = true): Promise<Race> {
    const raw = await network().get<{ data: unknown }>('/pub/by-slug', {
      params: { slug, is_detail: isDetail },
    });
    // TODO: implement race normalizer
    return raw.data as Race;
  },
};
