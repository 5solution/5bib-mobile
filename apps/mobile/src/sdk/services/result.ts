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
  return {
    id: String(r.id ?? ''),
    athleteId: r.athlete_id != null ? String(r.athlete_id) : undefined,
    raceId: r.race_id != null ? String(r.race_id) : undefined,
    courseId: r.course_id != null ? String(r.course_id) : undefined,
    bib: (r.bib as string | undefined) ?? (r.bib_number as string | undefined),
    finishTime: (r.finish_time as string | undefined) ?? (r.finishTime as string | undefined),
    rank: (r.rank as number | undefined) ?? (r.overall_rank as number | undefined),
    rankAgeGroup:
      (r.rank_age_group as number | undefined) ??
      (r.rankAgeGroup as number | undefined),
    status: r.status as string | undefined,
    certificateUrl:
      (r.certificate_url as string | undefined) ??
      (r.certificateUrl as string | undefined),
    raceName: (r.race_name as string | undefined) ?? (r.raceName as string | undefined),
    courseName: (r.course_name as string | undefined) ?? (r.courseName as string | undefined),
    raceDate: (r.race_date as string | undefined) ?? (r.raceDate as string | undefined),
  };
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
    }>('/athlete/result', { params: { pageNo, pageSize, sortDirection } });
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
