/**
 * apps/mobile/src/sdk/validations/e-waiver.ts
 *
 * Zod schemas for e-waiver / disclaimer flow.
 *
 * Source: 01-ba-prd-epic-6-ewaiver.md
 */
import { z } from 'zod';

/** Step 1: race + email to request OTP. */
export const requestSigningOtpSchema = z.object({
  raceId: z.string().min(1, 'Vui lòng chọn race'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email bắt buộc')
    .email('Email không hợp lệ'),
});
export type RequestSigningOtpInput = z.infer<typeof requestSigningOtpSchema>;

/** Step 2: verify OTP. */
export const verifySigningOtpSchema = z.object({
  raceId: z.string().min(1),
  email: z.string().trim().toLowerCase().email(),
  otp: z
    .string()
    .trim()
    .length(6, 'OTP phải gồm 6 chữ số')
    .regex(/^\d{6}$/, 'OTP chỉ chứa số'),
});
export type VerifySigningOtpInput = z.infer<typeof verifySigningOtpSchema>;

/**
 * Step 3 (signing canvas form): athlete confirms identity + signs.
 * The signed image becomes a base64 PNG that the app uploads via
 * `upload.uploadFree` then submits HTML via `eWaiver.submitSignedDisclaimer`.
 */
export const signDisclaimerSchema = z.object({
  codeValue: z.string().min(1),
  /** Base64-encoded PNG of the signature stroke. */
  signatureDataUrl: z
    .string()
    .startsWith('data:image/', 'Chữ ký không hợp lệ'),
  agreeAll: z.literal(true, {
    errorMap: () => ({ message: 'Bạn phải đồng ý toàn bộ điều khoản' }),
  }),
});
export type SignDisclaimerInput = z.infer<typeof signDisclaimerSchema>;

/**
 * Optional: delegator signs on behalf of minor athlete.
 * Required by submitSignedDisclaimer when athlete is under 18.
 */
export const delegatorSigningSchema = z.object({
  name: z.string().trim().min(1, 'Tên giám hộ bắt buộc'),
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?\d{8,15})$/, 'SĐT không hợp lệ'),
  cccd: z
    .string()
    .trim()
    .min(6, 'CCCD tối thiểu 6 ký tự')
    .max(20),
});
export type DelegatorSigningInput = z.infer<typeof delegatorSigningSchema>;
