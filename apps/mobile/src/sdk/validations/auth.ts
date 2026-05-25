/**
 * apps/mobile/src/sdk/validations/auth.ts
 *
 * Zod schemas for auth flows: login, register, forgot, reset.
 *
 * Improvements over web:
 *   - Strict password regex: lowercase + uppercase + digit + special, 8–20 chars
 *   - Email lowercased + trimmed
 *   - `agreeTerms` is FRONTEND-ONLY (NOT sent to backend per BR-AUTH register)
 *
 * Source: 01-ba-prd-overview.md, 01-ba-prd-epic-1-auth.md
 */
import { z } from 'zod';

/** Password requirements (BR-AUTH): 8–20 chars, must contain
 *  lowercase letter, uppercase letter, digit, special char. */
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{8,20}$/;

const PASSWORD_MESSAGE =
  'Mật khẩu phải 8–20 ký tự, gồm chữ hoa, chữ thường, số, ký tự đặc biệt';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email không được để trống')
  .email('Email không hợp lệ');

const passwordSchema = z
  .string()
  .min(8, PASSWORD_MESSAGE)
  .max(20, PASSWORD_MESSAGE)
  .regex(PASSWORD_REGEX, PASSWORD_MESSAGE);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mật khẩu không được để trống'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Tên phải từ 2 ký tự')
      .max(80, 'Tên tối đa 80 ký tự'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    // FRONTEND-ONLY — NOT sent to backend
    agreeTerms: z.literal(true, {
      errorMap: () => ({ message: 'Bạn cần đồng ý điều khoản sử dụng' }),
    }),
    isRunner: z.boolean().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp',
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotSchema = z.object({
  email: emailSchema,
});
export type ForgotInput = z.infer<typeof forgotSchema>;

export const resetSchema = z
  .object({
    email: emailSchema,
    otp: z
      .string()
      .trim()
      .length(6, 'OTP phải gồm 6 chữ số')
      .regex(/^\d{6}$/, 'OTP chỉ chứa số'),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string(),
  })
  .refine((d) => d.newPassword === d.newPasswordConfirm, {
    path: ['newPasswordConfirm'],
    message: 'Mật khẩu xác nhận không khớp',
  });
export type ResetInput = z.infer<typeof resetSchema>;
