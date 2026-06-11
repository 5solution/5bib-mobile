/**
 * apps/mobile/src/sdk/services/race.ts
 *
 * Race / event browsing service. Consumer sees CLEAN shape (camelCase).
 * Internal: legacy backend shape (snake_case query params, mixed body).
 *
 * Source: docs/API_REFERENCE.md "EPIC-2 Browsing (Race Detail)".
 */
import { network } from '../core';
import type { ListRacesResponse, Race, RaceCourse, TicketType } from '../models';

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
  /**
   * Province / city filter — server-side, contains-style match. Verified
   * live 2026-06-11: `province=Hà Nội` matches races whose province is
   * "Thành phố Hà Nội". This is what the web sends (`params.province = l`);
   * the earlier "backend doesn't support city" note in events/index.tsx
   * was wrong.
   */
  province?: string;
  /**
   * Event-date window — ISO strings, verified live 2026-06-11. Web's
   * "Thời gian tổ chức" combobox sends from_date=now, to_date=now+N days.
   * ⚠️ Races with NULL event_start_date are INCLUDED in windowed results
   * (backend behavior, web shows them too). ⚠️ The "+07:00" timezone form
   * must be URL-encoded or the "+" decodes to a space → 400 "Mismatch
   * request param"; axios params encoding handles this automatically.
   */
  fromDate?: string;
  toDate?: string;
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

/**
 * Convert clean param shape → backend query params.
 *
 * ⚠️ MIXED CONVENTION — same trap as /order and /codes/me, re-verified live
 * on /pub/race 2026-06-11:
 *   - pagination + sort MUST be camelCase (pageNo/pageSize/sortField/
 *     sortDirection). The snake_case versions are SILENTLY IGNORED:
 *     page_no=2 returned page 1 again (currentPage: 0) and page_size was
 *     ignored too — which made infinite scroll re-append page 1 forever
 *     and pinned the sort to id ASC (ancient races first).
 *   - filters stay snake_case (race_type/is_highlight/bib_set_up) or
 *     verbatim (status/title/province — what the web sends).
 *   - sortField values are entity property names: eventStartDate works,
 *     startDate and start_date do not.
 */
function toLegacyListParams(p: ListRacesParams): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.pageNo !== undefined) out.pageNo = p.pageNo;
  if (p.pageSize !== undefined) out.pageSize = p.pageSize;
  if (p.sortField !== undefined) out.sortField = p.sortField;
  if (p.sortDirection !== undefined) out.sortDirection = p.sortDirection;
  if (p.status !== undefined) out.status = p.status;
  if (p.title !== undefined) out.title = p.title;
  if (p.raceType !== undefined) out.race_type = p.raceType;
  if (p.isHighlight !== undefined) out.is_highlight = p.isHighlight;
  if (p.bibSetUp !== undefined) out.bib_set_up = p.bibSetUp;
  if (p.province !== undefined) out.province = p.province;
  if (p.fromDate !== undefined) out.from_date = p.fromDate;
  if (p.toDate !== undefined) out.to_date = p.toDate;
  return out;
}

/**
 * Pass-through normalize: backend race shape is rich and partially camelCase
 * already. We coerce id to string and surface common alias fields. Mobile
 * consumers should treat `unknown` fields with optional access (`race.xyz?.`).
 * TODO: tighten Race model fields as screens are built.
 */
/** Exported for normalize/ticket.ts — tickets embed a full raw race object. */
export function normalizeRace(raw: unknown): Race {
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
      // ext.banner is sometimes a STRING URL (race 305) and sometimes a
      // structured object (race 257: { banner_header_event: { img_url } }).
      // Handle both.
      (typeof ext.banner === 'string' ? (ext.banner as string) : null) ??
      ((ext.banner as { banner_header_event?: { img_url?: string } } | null)
        ?.banner_header_event?.img_url ?? null) ??
      (ext.detail_img as string | null | undefined) ??
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
    rule: (r.rule as string | undefined) ?? undefined,
    latitude: (r.latitude as number | undefined) ?? (r.event_lat as number | undefined),
    longitude: (r.longitude as number | undefined) ?? (r.event_lng as number | undefined),
    // Payment allow-list is nested in race_extenstion (sic — backend typo).
    paymentOptions: Array.isArray(ext.payment_options)
      ? (ext.payment_options as string[])
      : undefined,
    racekitEditEnable:
      r.racekit_edit_enable != null
        ? Boolean(r.racekit_edit_enable)
        : ext.racekit_edit_enable != null
          ? Boolean(ext.racekit_edit_enable)
          : undefined,
    registrationEndTime:
      (r.registration_end_time as string | undefined) ??
      (r.registrationEndTime as string | undefined),
    reassignStartTime: r.reassign_start_time as string | undefined,
    reassignEndTime: r.reassign_end_time as string | undefined,
    checkinEndTime: r.checkin_end_time as string | undefined,
    changeCourseEnable:
      ext.change_course_enable != null
        ? Boolean(ext.change_course_enable)
        : undefined,
    delegationEnable:
      ext.enable_delegation_skip_liabilty != null
        ? Boolean(ext.enable_delegation_skip_liabilty)
        : undefined,
  };
}

/**
 * Internal helper: fetch one race's courses+tickets via `/pub/simple-course`,
 * normalize to clean shape with raceId stamped on each.
 */
async function fetchSimpleCoursesForOneRace(
  raceId: string,
): Promise<RaceCourse[]> {
  const raw = await network().get<{
    data: unknown[] | { list?: unknown[] };
  }>('/pub/simple-course', { params: { race_ids: raceId } });
  const list = Array.isArray(raw.data)
    ? (raw.data as Array<Record<string, unknown>>)
    : ((raw.data?.list ?? []) as Array<Record<string, unknown>>);
  return list.map((r) => {
    const tts = Array.isArray(r.ticket_types)
      ? (r.ticket_types as Array<Record<string, unknown>>)
      : [];
    const ticketTypes: TicketType[] = tts.map((tt) => ({
      id: String(tt.id ?? ''),
      raceCourseId: String(tt.race_course_id ?? r.id ?? ''),
      variantId:
        tt.variant_id != null
          ? String(tt.variant_id)
          : r.variant_id != null
            ? String(r.variant_id)
            : undefined,
      typeName: String(tt.type_name ?? tt.name ?? ''),
      price: Number(tt.price ?? 0),
      currency: 'VND',
      remainedTicket:
        tt.remained_ticket != null ? Number(tt.remained_ticket) : null,
      isFree: tt.is_free as boolean | undefined,
      isShow: tt.is_show as boolean | undefined,
    }));
    return {
      id: String(r.id ?? r.variant_id ?? ''),
      raceId,
      name: String(r.name ?? r.distance ?? ''),
      distance: String(r.distance ?? ''),
      price: Number(ticketTypes[0]?.price ?? r.price ?? 0),
      currency: 'VND',
      availableSlots: ticketTypes.reduce(
        (s, t) => s + Number(t.remainedTicket ?? 0),
        0,
      ),
      ticketTypes: ticketTypes.length > 0 ? ticketTypes : undefined,
    };
  });
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
   * Fetch courses (with ticket_types + prices) for multiple races in parallel
   * and return them grouped by raceId. Backend's `/pub/simple-course?race_ids`
   * does NOT tag each course with its race_id, so we have to call per-race —
   * but in parallel it's still ~1 round-trip latency for the home tab.
   *
   * Used by the home race grid to compute price ranges
   * ("100.000đ – 300.000đ") without falling back to single-price headlines.
   */
  async getCoursesByRaces(
    raceIds: string[],
  ): Promise<Map<string, RaceCourse[]>> {
    const m = new Map<string, RaceCourse[]>();
    if (raceIds.length === 0) return m;
    await Promise.all(
      raceIds.map(async (id) => {
        try {
          const list = await fetchSimpleCoursesForOneRace(id);
          m.set(id, list);
        } catch {
          // Soft-fail per race — empty entry; UI hides price range.
          m.set(id, []);
        }
      }),
    );
    return m;
  },

  /**
   * GET /pub/simple-course?race_ids=X,Y,Z — bulk fetch courses + ticket_types
   * for multiple races in one round trip. Returned shape mirrors single-race
   * `/pub/race-course` but flattened across all requested raceIds.
   *
   * NOTE: backend does NOT tag race_id per returned course — use
   * `getCoursesByRaces()` instead when you need grouping.
   */
  async getSimpleCourses(raceIds: string[]): Promise<RaceCourse[]> {
    if (raceIds.length === 0) return [];
    // Single-race call: trivial.
    if (raceIds.length === 1) return fetchSimpleCoursesForOneRace(raceIds[0]!);
    // Multi-race: parallel fan-out so each course is correctly stamped with
    // its race_id (backend doesn't tag it when called with comma-sep ids).
    const groups = await race.getCoursesByRaces(raceIds);
    const flat: RaceCourse[] = [];
    for (const list of groups.values()) flat.push(...list);
    return flat;
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
