/**
 * apps/mobile/src/sdk/constants/course-type.ts
 *
 * Race course type enum. Ported from web `src/constants/race-course.ts`.
 *
 * TODO: confirm full enum list with backend — these are the values seen
 * in web today; new sports (PICKLEBALL, BADMINTON, CYCLING) may need adding.
 */

export const COURSE_TYPE = {
  RUNNING: 'RUNNING',
  TRAIL: 'TRAIL',
  CYCLING: 'CYCLING',
  TRIATHLON: 'TRIATHLON',
  SWIMMING: 'SWIMMING',
  PICKLEBALL: 'PICKLEBALL',
  BADMINTON: 'BADMINTON',
  OTHER: 'OTHER',
} as const;

export type CourseType = (typeof COURSE_TYPE)[keyof typeof COURSE_TYPE];

/** Vietnamese display label per course type. */
export const COURSE_TYPE_LABEL_VI: Record<CourseType, string> = {
  RUNNING: 'Chạy bộ',
  TRAIL: 'Trail',
  CYCLING: 'Đạp xe',
  TRIATHLON: 'Ba môn phối hợp',
  SWIMMING: 'Bơi',
  PICKLEBALL: 'Pickleball',
  BADMINTON: 'Cầu lông',
  OTHER: 'Khác',
};
