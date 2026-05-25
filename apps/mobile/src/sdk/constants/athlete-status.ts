/**
 * apps/mobile/src/sdk/constants/athlete-status.ts
 *
 * Athlete status enum + per-status action button matrix.
 *
 * Reference: 01-ba-prd-epic-4-tickets.md rev2 — BR-TICKETS-01, BR-TICKETS-01b
 *
 * 8 athlete statuses (per web reality) — matches backend AthleteStatus enum.
 */

export const ATHLETE_STATUS = {
  NEW: 'NEW',
  TRANSFERRING: 'TRANSFERRING',
  REGISTER: 'REGISTER',
  REMIND_CHECK_IN: 'REMIND_CHECK_IN',
  CHECKED_IN: 'CHECKED_IN',
  RACEKIT_RECEIVED: 'RACEKIT_RECEIVED',
  RACEKIT_NOT_RECEIVED: 'RACEKIT_NOT_RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;

export type AthleteStatus = (typeof ATHLETE_STATUS)[keyof typeof ATHLETE_STATUS];

/** Action types available across statuses (S-TICKETS-02 buttons). */
export type AthleteAction =
  | 'TRANSFER'
  | 'REGISTER_FORM'
  | 'EDIT_INFO'
  | 'CHANGE_COURSE'
  | 'EWAIVER'
  | 'ROLLING_BIB'
  | 'SHARE_BIB'
  | 'VIEW_RESULT'
  | 'CONTACT_SUPPORT'
  | 'VIEW_ORDER';

/** Action matrix per BR-TICKETS-01b — drives StatusActionButtons render. */
export const ATHLETE_STATUS_ACTIONS: Record<AthleteStatus, AthleteAction[]> = {
  NEW: ['TRANSFER', 'REGISTER_FORM'],
  TRANSFERRING: [], // status banner only, no actions
  REGISTER: ['EDIT_INFO', 'CHANGE_COURSE', 'TRANSFER', 'EWAIVER', 'ROLLING_BIB'],
  REMIND_CHECK_IN: ['EDIT_INFO', 'EWAIVER', 'SHARE_BIB'],
  CHECKED_IN: ['SHARE_BIB', 'VIEW_RESULT'],
  RACEKIT_RECEIVED: ['SHARE_BIB', 'VIEW_RESULT'],
  RACEKIT_NOT_RECEIVED: ['SHARE_BIB', 'CONTACT_SUPPORT'],
  CANCELLED: ['VIEW_ORDER'],
};

/** Localized VN labels per action — used by StatusActionButtons. */
export const ATHLETE_ACTION_LABELS: Record<AthleteAction, string> = {
  TRANSFER: 'Chuyển vé',
  REGISTER_FORM: 'Hoàn thiện thông tin',
  EDIT_INFO: 'Chỉnh sửa thông tin',
  CHANGE_COURSE: 'Đổi cự ly',
  EWAIVER: 'Ký E-Waiver',
  ROLLING_BIB: 'Quay BIB',
  SHARE_BIB: 'Chia sẻ BIB',
  VIEW_RESULT: 'Xem kết quả',
  CONTACT_SUPPORT: 'Liên hệ hỗ trợ',
  VIEW_ORDER: 'Xem đơn hàng',
};

/** Localized VN labels per status — used by StatusBadge / banners. */
export const ATHLETE_STATUS_LABELS: Record<AthleteStatus, string> = {
  NEW: 'Mới',
  TRANSFERRING: 'Đang chuyển',
  REGISTER: 'Chờ hoàn thiện',
  REMIND_CHECK_IN: 'Cần check-in',
  CHECKED_IN: 'Đã check-in',
  RACEKIT_RECEIVED: 'Đã nhận racekit',
  RACEKIT_NOT_RECEIVED: 'Chưa nhận racekit',
  CANCELLED: 'Đã huỷ',
};
