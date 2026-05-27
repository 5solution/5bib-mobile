/**
 * apps/mobile/src/sdk/services/race-course.ts
 *
 * Race course (distance variant) service. Consumer sees CLEAN shape.
 * Internal: legacy backend shape (`variant_id` param NOT `course_id`, etc.).
 *
 * Source: docs/API_REFERENCE.md "EPIC-2 Browsing (Race Detail)" +
 *         "EPIC-7 Metadata + Config" (ticket-type sub-endpoints).
 */
import { network } from '../core';
import type { RaceCourse } from '../models';

/**
 * Defensive normalize: backend race-course shape has many optional fields
 * (snake_case). Keep mapping minimal — extend as screens demand more.
 *
 * IMPORTANT — price + availability lookup hierarchy (verified 2026-05-27 via
 * /pub/race-course?race_id=305):
 *   course.price            → ALWAYS null at top level
 *   course.ticket_types[0]  → real ticket; has `price`, `remained_ticket`,
 *                              `sales_count`, `currency`. There can be
 *                              multiple ticket_types per course (ELB/Standard/VIP);
 *                              we use the first as the headline price + sum
 *                              all remained_ticket for availability.
 * Without this fallback every course renders "0d" on the detail screen.
 */
function normalizeRaceCourse(raw: unknown): RaceCourse {
  const r = (raw ?? {}) as Record<string, unknown>;
  const ticketTypes = Array.isArray(r.ticket_types)
    ? (r.ticket_types as Array<Record<string, unknown>>)
    : [];
  const firstTicket = ticketTypes[0];
  // Sum remained_ticket across ticket_types so a course shows availability
  // even when ticket_types[0] is sold out but others have stock.
  const totalRemained = ticketTypes.reduce(
    (sum, tt) => sum + Number(tt?.remained_ticket ?? 0),
    0,
  );
  return {
    id: String(r.id ?? r.race_course_id ?? r.variant_id ?? ''),
    raceId:
      (r.race_id != null ? String(r.race_id) : undefined) ??
      (r.raceId as string | undefined),
    name: String(r.name ?? r.course_name ?? r.distance ?? ''),
    distance: String(r.distance ?? r.course_distance ?? ''),
    distanceMeters:
      (r.distance_meters as number | undefined) ??
      (r.distanceMeters as number | undefined),
    price: Number(r.price ?? r.amount ?? firstTicket?.price ?? 0),
    currency: String(firstTicket?.currency ?? 'VND'),
    availableSlots:
      (r.available_slots as number | null | undefined) ??
      (r.availableSlots as number | null | undefined) ??
      (ticketTypes.length > 0 ? totalRemained : null),
    totalSlots:
      (r.total_slots as number | undefined) ??
      (r.totalSlots as number | undefined),
    saleOpenAt:
      (r.open_for_sale_date_time as string | undefined) ??
      (r.sale_open_at as string | undefined) ??
      (r.saleOpenAt as string | undefined),
    saleCloseAt:
      (r.close_for_sale_date_time as string | undefined) ??
      (r.sale_close_at as string | undefined) ??
      (r.saleCloseAt as string | undefined),
    description: r.description as string | undefined,
    elevationGain:
      (r.elevation_gain as number | undefined) ??
      (r.elevationGain as number | undefined),
    elevationLoss:
      (r.elevation_loss as number | undefined) ??
      (r.elevationLoss as number | undefined),
    cutOffMinutes:
      (r.cut_off_minutes as number | undefined) ??
      (r.cutOffMinutes as number | undefined),
    mapImageUrl:
      (r.map_image_url as string | undefined) ??
      (r.mapImageUrl as string | undefined),
    coordinates: r.coordinates as RaceCourse['coordinates'],
  };
}

export const raceCourse = {
  /**
   * GET /pub/race-course?race_id=X&status=GENERATED_CODE — courses of a race.
   * status filter: `GENERATED_CODE` = ready for sale (default).
   */
  async listCoursesByRace(
    raceId: string,
    status: string = 'GENERATED_CODE',
  ): Promise<RaceCourse[]> {
    const raw = await network().get<{
      data: { list?: unknown[] } | unknown[];
    }>('/pub/race-course', { params: { race_id: raceId, status } });
    const list = Array.isArray(raw.data) ? raw.data : (raw.data?.list ?? []);
    return list.map(normalizeRaceCourse);
  },

  /**
   * GET /pub/race-course-by-id?variant_id=X — course detail.
   * ⚠️ Param name is `variant_id` (legacy: course tied to product variant).
   */
  async getCourseDetail(variantId: string): Promise<RaceCourse> {
    const raw = await network().get<{ data: unknown }>(
      '/pub/race-course-by-id',
      { params: { variant_id: variantId } },
    );
    return normalizeRaceCourse(raw.data);
  },

  /**
   * GET /pub/ticket-type?is_free=true — global ticket types.
   * Returns minimal info — consumer uses this for free-ticket filtering.
   */
  async getTicketTypes(opts?: { isFree?: boolean }): Promise<unknown[]> {
    const params: Record<string, unknown> = {};
    if (opts?.isFree !== undefined) params.is_free = opts.isFree;
    const raw = await network().get<{ data: unknown[] | { list?: unknown[] } }>(
      '/pub/ticket-type',
      { params },
    );
    if (Array.isArray(raw.data)) return raw.data;
    return raw.data?.list ?? [];
  },

  /**
   * GET /ticket-type/by-race-course?race_course_id=X — ticket types for a course.
   */
  async getTicketTypesByCourse(raceCourseId: string): Promise<unknown[]> {
    const raw = await network().get<{ data: unknown[] | { list?: unknown[] } }>(
      '/ticket-type/by-race-course',
      { params: { race_course_id: raceCourseId } },
    );
    if (Array.isArray(raw.data)) return raw.data;
    return raw.data?.list ?? [];
  },

  /**
   * GET /ticket-type/by-variant?variant_id=X — ticket types for a variant.
   */
  async getTicketTypesByVariant(variantId: string): Promise<unknown[]> {
    const raw = await network().get<{ data: unknown[] | { list?: unknown[] } }>(
      '/ticket-type/by-variant',
      { params: { variant_id: variantId } },
    );
    if (Array.isArray(raw.data)) return raw.data;
    return raw.data?.list ?? [];
  },
};
