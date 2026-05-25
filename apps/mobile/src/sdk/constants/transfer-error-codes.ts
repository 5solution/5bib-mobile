/**
 * apps/mobile/src/sdk/constants/transfer-error-codes.ts
 *
 * 8 backend error codes for /athlete/transfer → Vietnamese mapping.
 *
 * Source: 01-ba-prd-epic-4-tickets.md (BR-TICKETS-20)
 */

export const TRANSFER_ERROR_CODE = {
  OUTSIDE_TRANSFER_PERIOD: 'OUTSIDE_TRANSFER_PERIOD',
  RACE_REASSIGN_TIME_INVALID: 'RACE_REASSIGN_TIME_INVALID',
  CANNOT_TRANSFER_ZERO_PRICE: 'CANNOT_TRANSFER_ZERO_PRICE',
  SAME_RECEIVER: 'SAME_RECEIVER',
  EMAIL_NOT_EXIST: 'EMAIL_NOT_EXIST',
  TICKET_ALREADY_TRANSFERRED: 'TICKET_ALREADY_TRANSFERRED',
  RACE_FINISHED: 'RACE_FINISHED',
  EXCEED_MAX_TRANSFER_COUNT: 'EXCEED_MAX_TRANSFER_COUNT',
} as const;

export type TransferErrorCode =
  (typeof TRANSFER_ERROR_CODE)[keyof typeof TRANSFER_ERROR_CODE];

/** Vietnamese message per error code (BR-TICKETS-20). */
export const TRANSFER_ERROR_MESSAGES_VI: Record<TransferErrorCode, string> = {
  OUTSIDE_TRANSFER_PERIOD: 'Ngoài thời gian chuyển nhượng',
  RACE_REASSIGN_TIME_INVALID: 'Chưa đến giờ chuyển BIB',
  CANNOT_TRANSFER_ZERO_PRICE: 'Không thể chuyển vé miễn phí',
  SAME_RECEIVER: 'Không thể chuyển cho chính mình',
  EMAIL_NOT_EXIST: 'Email người nhận chưa có tài khoản',
  TICKET_ALREADY_TRANSFERRED: 'Vé đã được chuyển trước đó',
  RACE_FINISHED: 'Race đã kết thúc, không thể chuyển',
  EXCEED_MAX_TRANSFER_COUNT: 'Vé đã đạt giới hạn số lần chuyển',
};

/** Default fallback when backend returns an unknown error code. */
export const TRANSFER_ERROR_FALLBACK_VI =
  'Không thể chuyển vé. Vui lòng thử lại hoặc liên hệ hỗ trợ.';

/**
 * Map a backend error code (or arbitrary string) → Vietnamese message.
 * Returns `TRANSFER_ERROR_FALLBACK_VI` if code unrecognized.
 */
export function getTransferErrorMessage(code: string | undefined): string {
  if (!code) return TRANSFER_ERROR_FALLBACK_VI;
  const msg = TRANSFER_ERROR_MESSAGES_VI[code as TransferErrorCode];
  return msg ?? TRANSFER_ERROR_FALLBACK_VI;
}
