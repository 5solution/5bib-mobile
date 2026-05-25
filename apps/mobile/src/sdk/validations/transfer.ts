/**
 * apps/mobile/src/sdk/validations/transfer.ts
 *
 * Zod schema for BIB transfer form.
 *
 * Source: 01-ba-prd-epic-4-tickets.md (BR-TICKETS-20)
 */
import { z } from 'zod';

export const transferTicketSchema = z
  .object({
    receiptEmail: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Email người nhận bắt buộc')
      .email('Email không hợp lệ'),
    confirmReceiptEmail: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Vui lòng nhập lại email'),
    message: z.string().trim().max(500, 'Lời nhắn tối đa 500 ký tự').optional(),
  })
  .refine((d) => d.receiptEmail === d.confirmReceiptEmail, {
    path: ['confirmReceiptEmail'],
    message: 'Email xác nhận không khớp',
  });

export type TransferTicketInput = z.infer<typeof transferTicketSchema>;
