/**
 * apps/mobile/src/sdk/validations/checkout.ts
 *
 * Checkout-form zod schemas: athlete (with age-vs-event-date validation),
 * VAT (discriminated union), order create payload.
 *
 * Source: 01-ba-prd-epic-3-checkout.md
 * - BR-CHECKOUT-22: VAT discriminated union
 * - BR-CHECKOUT-26: Age validation at EVENT date (not today),
 *   per-course `min_age`
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// VAT — BR-CHECKOUT-22 discriminated union
// ---------------------------------------------------------------------------

export const vatSchema = z.discriminatedUnion('vat', [
  z.object({ vat: z.literal(false) }),
  z.object({
    vat: z.literal(true),
    companyName: z.string().trim().min(1, 'Tên công ty bắt buộc'),
    tax: z.string().trim().min(1, 'Mã số thuế bắt buộc'),
    companyAddress: z.string().trim().min(1, 'Địa chỉ công ty bắt buộc'),
    companyReceiverName: z.string().trim().min(1, 'Tên người nhận hoá đơn bắt buộc'),
    companyPhone: z
      .string()
      .trim()
      .regex(/^(\+?\d{8,15})$/, 'Số điện thoại không hợp lệ'),
    companyEmail: z.string().trim().toLowerCase().email('Email công ty không hợp lệ'),
  }),
]);
export type VatInput = z.infer<typeof vatSchema>;

// ---------------------------------------------------------------------------
// Athlete — BR-CHECKOUT-26 age validation factory
// ---------------------------------------------------------------------------

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function calcAgeAt(dobIso: string, refIso: string): number {
  const dob = new Date(dobIso);
  const ref = new Date(refIso);
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--;
  return age;
}

/**
 * Factory: schema bound to a specific event start date + course min_age.
 * BR-CHECKOUT-26: age validated at event date, not at form submission.
 */
export function getAthleteSchema(opts: {
  eventStartDate: string; // ISO date — race start
  courseMinAge?: number;  // undefined → no minimum
}) {
  return z.object({
    firstName: z.string().trim().min(1, 'Họ bắt buộc').max(50),
    lastName: z.string().trim().min(1, 'Tên bắt buộc').max(50),
    email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
    phone: z
      .string()
      .trim()
      .regex(/^(\+?\d{8,15})$/, 'Số điện thoại không hợp lệ'),
    dob: z
      .string()
      .regex(ISO_DATE_RE, 'Ngày sinh phải định dạng YYYY-MM-DD')
      .refine(
        (dob) => {
          if (opts.courseMinAge == null) return true;
          return calcAgeAt(dob, opts.eventStartDate) >= opts.courseMinAge;
        },
        {
          message: opts.courseMinAge
            ? `Phải đủ ${opts.courseMinAge} tuổi tính tới ngày sự kiện`
            : 'Ngày sinh không hợp lệ',
        },
      ),
    gender: z.enum(['male', 'female', 'other']),
    nationality: z.string().trim().min(1, 'Quốc tịch bắt buộc'),
    idNumber: z
      .string()
      .trim()
      .min(6, 'Số CMND/CCCD/Passport tối thiểu 6 ký tự')
      .max(20),
    tshirtSize: z.string().trim().min(1, 'Vui lòng chọn size áo'),
    racekit: z.string().trim().min(1, 'Vui lòng chọn racekit'),
    nameOnBib: z
      .string()
      .trim()
      .min(1, 'Tên trên BIB bắt buộc')
      .max(15, 'Tên trên BIB tối đa 15 ký tự'),
    emergencyContactName: z.string().trim().min(1, 'Tên liên hệ khẩn cấp bắt buộc'),
    emergencyContactPhone: z
      .string()
      .trim()
      .regex(/^(\+?\d{8,15})$/, 'SĐT liên hệ khẩn cấp không hợp lệ'),
    bloodType: z.string().trim().optional(),
    medicalInformation: z.string().trim().max(500).optional(),
    currentMedication: z.string().trim().max(500).optional(),
    address: z.string().trim().max(200).optional(),
    club: z.string().trim().max(80).optional(),
    achievements: z.string().trim().max(500).optional(),
  });
}

export type AthleteInput = z.infer<ReturnType<typeof getAthleteSchema>>;

// ---------------------------------------------------------------------------
// Delegator + Guardian
// ---------------------------------------------------------------------------

export const delegatorSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().regex(/^(\+?\d{8,15})$/),
  email: z.string().trim().toLowerCase().email(),
  cccd: z.string().trim().min(6).max(20),
});
export type DelegatorInput = z.infer<typeof delegatorSchema>;

export function getGuardianSchema(opts: { eventStartDate: string }) {
  return z.object({
    name: z.string().trim().min(1, 'Tên người giám hộ bắt buộc'),
    dob: z
      .string()
      .regex(ISO_DATE_RE)
      .refine((dob) => calcAgeAt(dob, opts.eventStartDate) >= 18, {
        message: 'Người giám hộ phải đủ 18 tuổi tính tới ngày sự kiện',
      }),
    identity: z.string().trim().min(6).max(20),
    email: z.string().trim().toLowerCase().email(),
    phone: z.string().trim().regex(/^(\+?\d{8,15})$/),
    relation: z.string().trim().min(1, 'Mối quan hệ bắt buộc'),
  });
}
export type GuardianInput = z.infer<ReturnType<typeof getGuardianSchema>>;
