/**
 * apps/mobile/src/sdk/services/result.ts
 *
 * Race result service — list user's results + cert links.
 * Note: full results browsing lives on `result.5bib.com` WebView per
 * reduced PRD EPIC-5 scope. This service covers:
 *   - my-results list (mobile dashboard widget)
 *   - cert URL (share button)
 *   - public bib lookup (fallback)
 *
 * Source: docs/API_REFERENCE.md "EPIC-5 Results".
 */
import { network } from '../core';
import type { RaceResultRow } from '../models';

function normalizeResult(raw: unknown): RaceResultRow {
  const r = (raw ?? {}) as Record<string, unknown>;
  // ⚠️ Verified live 2026-06-12 (/athlete/result): race/course identity is
  // NESTED under `course_info` ({race_name, course_name, distance,
  // medal_url, ticket_image}); finish time is `chip_time`/`gun_time`;
  // rank is `overall_rank`; cert link is `certificate`. The flat
  // race_name/course_name/finish_time/race_date keys this normalizer
  // originally read do not exist on the wire (F27 — history rendered "—").
  const ci = (r.course_info ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? ''),
    athleteId: r.athlete_id != null ? String(r.athlete_id) : undefined,
    raceId: r.race_id != null ? String(r.race_id) : undefined,
    courseId: r.course_id != null ? String(r.course_id) : undefined,
    bib: (r.bib as string | undefined) ?? (r.bib_number as string | undefined),
    finishTime:
      (r.chip_time as string | undefined) ??
      (r.gun_time as string | undefined) ??
      (r.finish_time as string | undefined) ??
      (r.finishTime as string | undefined),
    rank: toRankNumber(r.rank ?? r.overall_rank),
    rankAgeGroup:
      (r.rank_age_group as number | undefined) ??
      (r.rankAgeGroup as number | undefined),
    status: r.status as string | undefined,
    certificateUrl:
      (r.certificate as string | undefined) ??
      (r.certificate_url as string | undefined) ??
      (r.certificateUrl as string | undefined),
    raceName:
      (ci.race_name as string | undefined) ??
      (r.race_name as string | undefined) ??
      (r.raceName as string | undefined),
    courseName:
      (ci.course_name as string | undefined) ??
      (r.course_name as string | undefined) ??
      (r.courseName as string | undefined),
    /** Display distance, e.g. "10KM" — from course_info. */
    distance: (ci.distance as string | undefined) ?? undefined,
    raceDate: (r.race_date as string | undefined) ?? (r.raceDate as string | undefined),
  };
}

/** Backend sends overall_rank as number OR numeric string — coerce. */
function toRankNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export interface ListMyResultsParams {
  pageNo?: number;
  pageSize?: number;
  sortDirection?: 'ASC' | 'DESC';
}

export const result = {
  /**
   * GET /athlete/result — user's race results.
   * Backend returns paginated list; we return flat array for mobile widget.
   */
  async listMyResults(params: ListMyResultsParams = {}): Promise<RaceResultRow[]> {
    const { pageNo = 1, pageSize = 10, sortDirection = 'DESC' } = params;
    const raw = await network().get<{
      data: { list?: unknown[] } | unknown[];
    }>('/athlete/result', {
      // snake_case per backend convention.
      // camelCase REQUIRED — snake_case is silently ignored by this endpoint
      // (probed live 2026-06-12: page_size=1 still returned the full page).
      // Same trap as /codes/fetch-by-user pagination.
      params: { pageNo, pageSize, sortDirection },
    });
    const list = Array.isArray(raw.data) ? raw.data : (raw.data?.list ?? []);
    return list.map(normalizeResult);
  },

  /**
   * GET /pub/rr/result-cert?result_id=X-Y — fetch shareable result certificate.
   * `result_id` format: `{courseId}-{bib}` or similar composite (see API_REFERENCE).
   */
  async getResultCert(resultId: string): Promise<{ url: string }> {
    const raw = await network().get<{ data: { url?: string } | string }>(
      '/pub/rr/result-cert',
      { params: { result_id: resultId } },
    );
    const data = raw.data;
    const url = typeof data === 'string' ? data : (data?.url ?? '');
    return { url };
  },

  /**
   * POST /pub/athlete-result — public result lookup by athlete identifier.
   * Body: `{ course_id, bibs }` (per selling-web). Mobile passes flat input.
   */
  async lookupAthleteResult(payload: {
    courseId: string;
    bibs: string;
  }): Promise<unknown> {
    const raw = await network().post<{ data: unknown }>(
      '/pub/athlete-result',
      {
        course_id: Number(payload.courseId),
        bibs: payload.bibs,
      },
      { noRetry: true },
    );
    return raw.data;
  },
};
