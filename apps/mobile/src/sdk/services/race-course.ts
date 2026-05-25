/**
 * apps/mobile/src/sdk/services/race-course.ts
 *
 * Race course (distance variant) service.
 *
 * Source: 01-ba-prd-epic-2-browsing.md, 01-ba-prd-epic-3-checkout.md
 */
import { network } from '../core';
import type { RaceCourse } from '../models';

export const raceCourse = {
  /**
   * GET /pub/races/course/:raceId — list courses of a race.
   */
  async listCoursesByRace(raceId: string): Promise<RaceCourse[]> {
    const raw = await network().get<{
      data: { list: unknown[] };
    }>(`/pub/races/course/${raceId}`);
    // TODO: implement race-course normalizer (snake_case → camelCase,
    // map `min_age`, `cut_off_minutes`, `available_slots`, etc.)
    return (raw.data.list as RaceCourse[]) ?? [];
  },

  /**
   * GET /pub/race-course-by-id?race_course_id=... — course detail.
   */
  async getCourseById(courseId: string): Promise<RaceCourse> {
    const raw = await network().get<{ data: unknown }>(
      '/pub/race-course-by-id',
      { params: { race_course_id: courseId } },
    );
    // TODO: implement race-course normalizer
    return raw.data as RaceCourse;
  },
};
