/**
 * apps/mobile/src/sdk/constants/athlete-status.ts
 *
 * Athlete status enum + per-status action button matrix + QR show condition.
 *
 * Reference:
 *   - 01-ba-prd-epic-4-tickets.md rev2 — BR-TICKETS-01, BR-TICKETS-01b
 *   - Web parity audit 2026-05-29 on dev.5bib.com /vi/tickets:
 *     · NEW → Chưa ghi danh + [Ghi danh, Chuyển nhượng, Đổi cự ly]
 *     · REGISTER → Đã ghi danh + [Đổi cự ly, Thay đổi thông tin, Chuyển nhượng, Chia sẻ]
 *     · REMIND_CHECK_IN → Chờ xác nhận + [Ký miễn trừ, Chuyển nhượng, Chia sẻ]
 *     · TRANSFERRING → Đang chuyển nhượng + (banner only)
 *     · CHECKED_IN → Đã check in + [Chia sẻ, Thay đổi ủy quyền nhận racekit] + QR
 *     · RACEKIT_RECEIVED → Đã nhận + [Chia sẻ, Xem kết quả] + QR
 *     · RACEKIT_NOT_RECEIVED → Không nhận + [Chia sẻ, Liên hệ hỗ trợ]
 *     · CANCELLED → Đã huỷ + [Xem đơn hàng]
 *
 * QR rule (Danny 2026-05-29): "không phải ở trạng thái nào cũng hiện QR code đâu"
 *   QR shown ONLY when status ∈ {CHECKED_IN, RACEKIT_RECEIVED}. Other statuses
 *   either don't have a meaningful BIB yet (NEW/REGISTER) or the QR is no longer
 *   actionable (CANCELLED, TRANSFERRING).
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
  | 'DELEGATE_RACEKIT'
  | 'VIEW_RESULT'
  | 'CONTACT_SUPPORT'
  | 'VIEW_ORDER';

/**
 * Action matrix per BR-TICKETS-01b — drives StatusActionButtons render.
 *
 * Order matters: first action gets primary variant. See StatusActionButtons.
 * ROLLING_BIB is mobile-only (web doesn't expose it) — included for REGISTER
 * since that's the registration completion path.
 */
export const ATHLETE_STATUS_ACTIONS: Record<AthleteStatus, AthleteAction[]> = {
  // CHANGE_COURSE removed from NEW 2026-06-11: web's ChangeCourseButton only
  // renders when status === Register (button.tsx) — the 2026-05-29 audit note
  // was misled by web's always-truthy branch bug.
  NEW: ['REGISTER_FORM', 'TRANSFER'],
  TRANSFERRING: [], // status banner only, no actions
  REGISTER: ['EDIT_INFO', 'CHANGE_COURSE', 'TRANSFER', 'SHARE_BIB', 'ROLLING_BIB'],
  REMIND_CHECK_IN: ['EWAIVER', 'TRANSFER', 'SHARE_BIB'],
  CHECKED_IN: ['SHARE_BIB', 'DELEGATE_RACEKIT', 'VIEW_RESULT'],
  RACEKIT_RECEIVED: ['SHARE_BIB', 'VIEW_RESULT'],
  RACEKIT_NOT_RECEIVED: ['SHARE_BIB', 'CONTACT_SUPPORT'],
  CANCELLED: ['VIEW_ORDER'],
};

/**
 * Localized VN labels per action — used by StatusActionButtons.
 * Wording matches dev.5bib.com web button labels for cross-platform parity.
 */
export const ATHLETE_ACTION_LABELS: Record<AthleteAction, string> = {
  TRANSFER: 'Chuyển nhượng vé',
  REGISTER_FORM: 'Ghi danh',
  EDIT_INFO: 'Thay đổi thông tin',
  CHANGE_COURSE: 'Đổi cự ly',
  EWAIVER: 'Ký miễn trừ',
  ROLLING_BIB: 'Quay BIB',
  SHARE_BIB: 'Chia sẻ',
  DELEGATE_RACEKIT: 'Thay đổi ủy quyền nhận racekit',
  VIEW_RESULT: 'Xem kết quả',
  CONTACT_SUPPORT: 'Liên hệ hỗ trợ',
  VIEW_ORDER: 'Xem đơn hàng',
};

/**
 * Localized VN labels per status — used by StatusBadge / banners.
 * Wording matches dev.5bib.com status badge labels.
 */
export const ATHLETE_STATUS_LABELS: Record<AthleteStatus, string> = {
  NEW: 'Chưa ghi danh',
  TRANSFERRING: 'Đang chuyển nhượng',
  REGISTER: 'Đã ghi danh',
  REMIND_CHECK_IN: 'Chờ xác nhận',
  CHECKED_IN: 'Đã check in',
  RACEKIT_RECEIVED: 'Đã nhận',
  RACEKIT_NOT_RECEIVED: 'Không nhận',
  CANCELLED: 'Đã huỷ',
};

/**
 * Badge color variant per status — drives StatusBadge visual.
 * info=blue (in-progress) / success=green (completed positive) /
 * warning=amber (action needed) / default=grey (neutral/terminal).
 */
export const ATHLETE_STATUS_VARIANT: Record<
  AthleteStatus,
  'success' | 'info' | 'warning' | 'default'
> = {
  NEW: 'warning',
  TRANSFERRING: 'default',
  REGISTER: 'success',
  REMIND_CHECK_IN: 'warning',
  CHECKED_IN: 'info',
  RACEKIT_RECEIVED: 'success',
  RACEKIT_NOT_RECEIVED: 'default',
  CANCELLED: 'default',
};

/**
 * Whether to render the QR code on the ticket detail screen.
 *
 * Per web parity (verified 2026-05-29): the QR card is shown only after the
 * athlete has been checked in at the event. Before that, the user either has
 * no meaningful BIB yet (NEW/REGISTER) or still needs to sign the e-waiver
 * (REMIND_CHECK_IN). After CANCELLED / TRANSFERRING the QR is no longer
 * actionable.
 */
export function shouldShowTicketQR(status: AthleteStatus): boolean {
  return status === 'CHECKED_IN' || status === 'RACEKIT_RECEIVED';
}
