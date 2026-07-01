// src/features/order/order.validation.js
import { z } from 'zod';
import { isRequestCakeDateValid } from './order.helper.js';

const strictBooleanSchema = z
  .union([z.boolean(), z.string()])
  .transform((val, ctx) => {
    if (typeof val === 'boolean') return val;

    const normalized = val.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'recipientDataConsent harus true atau false',
    });
    return z.NEVER;
  });

const checkoutBaseSchema = z.object({
  fulfillmentType: z.enum(['PICKUP', 'DELIVERY'], {
    message: 'fulfillmentType harus PICKUP atau DELIVERY',
  }),
  requestCakeDate: z.coerce.date({ message: 'requestCakeDate tidak valid' }),

  // hanya dipakai kalau DELIVERY
  recipientType: z.enum(['FOR_MYSELF', 'FOR_SOMEONE_ELSE']).optional(),
  recipientName: z.string().trim().min(1).optional(),
  recipientPhone: z.string().trim().min(8).optional(),
  recipientDataConsent: strictBooleanSchema.optional(),
  address: z.string().trim().min(1).optional(),
  addressLat: z.coerce.number().optional(),
  addressLng: z.coerce.number().optional(),
});

export const checkoutSchema = checkoutBaseSchema.superRefine((data, ctx) => {
  // ===== validasi tanggal, berlaku untuk PICKUP maupun DELIVERY =====
  if (!isRequestCakeDateValid(data.requestCakeDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Request cake date minimal 7 hari dari sekarang',
      path: ['requestCakeDate'],
    });
  }

  if (data.fulfillmentType !== 'DELIVERY') return;

  // ===== validasi khusus DELIVERY =====
  if (!data.recipientType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'recipientType wajib diisi untuk delivery',
      path: ['recipientType'],
    });
    return;
  }

  if (!data.address || data.addressLat === undefined || data.addressLng === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'address & titik lokasi (map) wajib diisi untuk delivery',
      path: ['address'],
    });
    return;
  }

  if (data.recipientType === 'FOR_SOMEONE_ELSE') {
    if (!data.recipientName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'recipientName wajib diisi',
        path: ['recipientName'],
      });
    }
    if (!data.recipientPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'recipientPhone wajib diisi',
        path: ['recipientPhone'],
      });
    }

    // WAJIB: user harus konfirmasi sudah dapat izin dari penerima
    if (!data.recipientDataConsent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Anda harus konfirmasi sudah mendapat izin dari penerima untuk membagikan datanya',
        path: ['recipientDataConsent'],
      });
    }
  }
});

export const orderIdParamSchema = z.object({
  id: z.string().uuid('Format id tidak valid'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
});