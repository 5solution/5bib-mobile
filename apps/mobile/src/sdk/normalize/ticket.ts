/**
 * apps/mobile/src/sdk/normalize/ticket.ts
 *
 * Ticket response normalizer.
 *
 * Source: 01-ba-prd-epic-4-tickets.md
 * BR-TICKETS-01: 8 athlete statuses (NEW, TRANSFERRING, REGISTER,
 * REMIND_CHECK_IN, CHECKED_IN, RACEKIT_RECEIVED, RACEKIT_NOT_RECEIVED,
 * CANCELLED). SDK keeps backend enum value as-is (string), action matrix
 * lives in `constants/athlete-status.ts`.
 */
import type { Ticket } from '../models';

export function normalizeTicket(raw: unknown): Ticket {
  const r = (raw ?? {}) as Record<string, unknown>;

  const basicInfoRaw = (r.basic_info ?? r.basicInfo ?? {}) as Record<
    string,
    unknown
  >;

  return {
    id: String(r.id ?? ''),
    value: String(r.value ?? r.code_value ?? ''),
    status: normalizeStatus(r.status),
    athleteStatus: normalizeAthleteStatus(
      r.athlete_status ?? r.athleteStatus,
    ),
    // Bib may arrive as number, string, or null — coerce to string for UI safety.
    bib:
      r.bib != null && r.bib !== ''
        ? String(r.bib)
        : (r.bib as string | undefined),
    raceCourseDistance:
      (r.race_course_distance as string | undefined) ??
      (r.raceCourseDistance as string | undefined),
    raceCourseName:
      (r.race_course_name as string | undefined) ??
      (r.raceCourseName as string | undefined),
    athleteName:
      (r.athlete_name as string | undefined) ??
      (r.athleteName as string | undefined),
    receiptEmail:
      (r.receipt_email as string | undefined) ??
      (r.receiptEmail as string | undefined),
    orderId:
      r.order_id != null ? String(r.order_id) : (r.orderId as string | undefined),
    createdOn:
      (r.created_on as string | undefined) ??
      (r.createdOn as string | undefined),
    modifiedOn:
      (r.modified_on as string | undefined) ??
      (r.modifiedOn as string | undefined),
    availableToChangeCourse: Boolean(
      r.available_to_change_course ?? r.availableToChangeCourse ?? false,
    ),
    // TODO: implement race normalizer and apply here when r.race present
    race: r.race as Ticket['race'],
    basicInfo: Object.keys(basicInfoRaw).length
      ? {
          value: String(basicInfoRaw.value ?? ''),
          courseId: String(basicInfoRaw.course_id ?? ''),
          courseName: String(basicInfoRaw.course_name ?? ''),
          raceName: String(basicInfoRaw.race_name ?? ''),
          closeForSaleDateTime: basicInfoRaw.close_for_sale_date_time as
            | string
            | undefined,
          openForSaleDateTime: basicInfoRaw.open_for_sale_date_time as
            | string
            | undefined,
          courseType: basicInfoRaw.course_type as string | undefined,
          courseDistance: String(basicInfoRaw.course_distance ?? ''),
          bib: basicInfoRaw.bib as string | undefined,
          rollingBibLastTime: basicInfoRaw.rolling_bib_last_time as
            | string
            | undefined,
          rollingBibValidUntil: basicInfoRaw.rolling_bib_valid_until as
            | string
            | undefined,
          availableToRoll: basicInfoRaw.available_to_roll as
            | boolean
            | undefined,
        }
      : undefined,
    // TODO: normalize athlete_basic_info subtree (athlete_represent, athlete_sub_info)
    athleteBasicInfo: (r.athlete_basic_info ?? r.athleteBasicInfo) as
      | Record<string, unknown>
      | undefined,
    disclaimerStatus: r.disclaimer_status as boolean | undefined,
  };
}

/**
 * Status now widened to string in models.ts. Pass through whatever backend
 * returns (normalized to UPPERCASE) so screens see the real enum value.
 * Default to 'ACTIVE' only when missing — never collapse a valid value.
 */
function normalizeStatus(s: unknown): Ticket['status'] {
  const v = String(s ?? '').toUpperCase();
  return v || 'ACTIVE';
}

/**
 * Pass-through: backend returns 8 documented statuses (NEW, REGISTER,
 * REMIND_CHECK_IN, CHECK_IN/CHECKED_IN, FINISH, DNF, DNS, DSQ, etc.).
 * Previously we collapsed everything to NOT_REGISTERED — that broke action
 * matrix rendering. Keep the raw uppercase value; consumers handle unknowns.
 */
function normalizeAthleteStatus(s: unknown): Ticket['athleteStatus'] {
  const v = String(s ?? '').toUpperCase();
  return v || 'NEW';
}
