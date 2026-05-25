/**
 * apps/mobile/src/sdk/constants/payment.ts
 *
 * Payment method enum + UI option list.
 * Ported from web `src/constants/payment.ts`.
 *
 * Source: 01-ba-prd-epic-3-checkout.md (payment gateway routing)
 */

export enum PaymentMethod {
  VNPay = 'vnpay',
  VNPAY_QR = 'VNPAYQR',
  OnePay = 'onepay',
  Momo = 'momo',
  Zalo = 'zalo',
  Bank = 'bank',
  VN_BANK = 'VNBANK',
  PAYOO = 'PAYOO',
  INT_CARD = 'INTCARD',
  QR_CODE = 'QR_CODE',
  PAYX_DOMESTIC_CARD = 'domestic_card',
  PAYX_QR = 'payx_qr',
  Unknown = 'unknown',
}

export interface PaymentOption {
  id: PaymentMethod;
  /** Vietnamese display name. */
  name: string;
  /** English subtitle. */
  subLabel: string;
  /** Logo asset path (relative to app's `assets/` dir). */
  logoPath: string;
  /** Optional secondary icon (e.g. multi-bank composite). */
  subIcon?: string;
  /** Disabled state — hidden from UI when true (e.g. gateway maintenance). */
  disabled: boolean;
  /** Stable analytics key. */
  key: string;
}

/**
 * Production payment options shown to user (ordered by preference).
 * Web parity — KEEP IN SYNC with `selling-web/src/constants/payment.ts`.
 */
export const paymentOptions: PaymentOption[] = [
  {
    id: PaymentMethod.PAYX_QR,
    name: 'Quét QR chuyển khoản ngân hàng - PayX QR',
    subLabel: 'Scan the QR code from your bank or e-wallet',
    logoPath: 'icons/payment/payx.svg',
    disabled: false,
    key: 'PAYX_QR',
  },
  {
    id: PaymentMethod.PAYX_DOMESTIC_CARD,
    name: 'PayX thẻ ATM nội địa',
    subLabel: 'Vietnamese domestic payment card',
    logoPath: 'icons/payment/payx.svg',
    disabled: false,
    key: 'PAYX_DOMESTIC_CARD',
  },
  {
    id: PaymentMethod.VNPAY_QR,
    name: 'Quét QR chuyển khoản ngân hàng',
    subLabel: 'Scan the QR code from your bank or e-wallet',
    logoPath: 'icons/payment/vnpay_qr.svg',
    disabled: false,
    key: 'VNPAY_QR',
  },
  {
    id: PaymentMethod.VN_BANK,
    name: 'Thẻ ATM nội địa',
    subLabel: 'Vietnamese domestic payment card (NAPAS)',
    logoPath: 'icons/payment/napas.svg',
    disabled: false,
    key: 'VNPAY_DOMESTIC_CARD',
  },
  {
    id: PaymentMethod.PAYOO,
    name: 'Ví điện tử Payoo',
    subLabel: 'Payoo e-wallet',
    logoPath: 'icons/payment/payoo.svg',
    disabled: false,
    key: 'PAYOO',
  },
  {
    id: PaymentMethod.INT_CARD,
    name: 'Thẻ tín dụng/Thẻ ghi nợ',
    subLabel: 'Vietnamese International payment card',
    logoPath: 'icons/payment/visa.svg',
    subIcon: 'icons/payment/multiple_payment_method.svg',
    disabled: false,
    key: 'VNPAY_INTERNATIONAL_CARD',
  },
  {
    id: PaymentMethod.OnePay,
    name: 'Thẻ tín dụng/ghi nợ phát hành ngoài lãnh thổ Việt Nam',
    subLabel: 'All Region International payment card',
    logoPath: 'icons/payment/onepay.svg',
    subIcon: 'icons/payment/multiple_payment_method.svg',
    disabled: false,
    key: 'ONEPAY_INTERNATIONAL_CARD',
  },
];

/** Reduced option set for dev/staging (no PayX). */
export const devPaymentOptions: PaymentOption[] = paymentOptions.filter(
  (o) =>
    o.id !== PaymentMethod.PAYX_QR &&
    o.id !== PaymentMethod.PAYX_DOMESTIC_CARD &&
    o.id !== PaymentMethod.PAYOO,
);

/** QR-only standalone option (BTC tự nhận chuyển khoản, không qua gateway). */
export const qrOptions: PaymentOption[] = [
  {
    id: PaymentMethod.QR_CODE,
    name: 'Quét QR chuyển khoản cho ban tổ chức',
    subLabel: 'Scan the QR code from your bank or e-wallet',
    logoPath: 'icons/payment/qr.svg',
    disabled: false,
    key: 'QR_CODE_DIRECT',
  },
];
