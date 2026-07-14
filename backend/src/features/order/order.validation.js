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
  // opsional: user boleh memilih menyertakan emailnya di pesan WhatsApp
  includeEmail: strictBooleanSchema.optional(),
  // string kosong dibiarkan lolos di sini (frontend mengirim "" saat alamat
  // belum terisi otomatis) — wajib-tidaknya alamat ditegakkan di superRefine:
  // wajib saat CONFIRM, tidak saat PREVIEW (ongkir cukup dari koordinat).
  address: z.string().trim().optional(),
  addressLat: z.coerce.number().optional(),
  addressLng: z.coerce.number().optional(),
});

/**
 * Refine bersama untuk checkout. `requireFullDetails`:
 *   - true  (CONFIRM): alamat teks + data penerima wajib lengkap.
 *   - false (PREVIEW): cukup titik lokasi (lat/lng) — ongkir dihitung murni
 *     dari koordinat, jadi jangan blokir kalau teks alamat / data penerima
 *     belum terisi (mis. alamat masih menunggu reverse-geocode dari peta).
 */
const makeCheckoutRefine = (requireFullDetails) => (data, ctx) => {
  // ===== validasi tanggal, berlaku untuk PICKUP maupun DELIVERY =====
  // Di PREVIEW tanggal boleh belum diisi (ongkir hanya butuh koordinat) —
  // validasi H+4 hanya dijalankan kalau tanggalnya memang dikirim.
  if (data.requestCakeDate !== undefined && !isRequestCakeDateValid(data.requestCakeDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Request cake date minimal 4 hari dari sekarang',
      path: ['requestCakeDate'],
    });
  }

  if (data.fulfillmentType !== 'DELIVERY') return;

  // ===== validasi khusus DELIVERY =====
  // Titik lokasi selalu wajib (dibutuhkan untuk hitung jarak/ongkir).
  if (data.addressLat === undefined || data.addressLng === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Titik lokasi (map) wajib diisi untuk delivery',
      path: ['addressLat'],
    });
    return;
  }

  // Selebihnya hanya wajib saat CONFIRM.
  if (!requireFullDetails) return;

  if (!data.recipientType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'recipientType wajib diisi untuk delivery',
      path: ['recipientType'],
    });
    return;
  }

  if (!data.address) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'address wajib diisi untuk delivery',
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
};

// CONFIRM: butuh alamat + data penerima lengkap (order benar-benar dibuat).
export const checkoutSchema = checkoutBaseSchema.superRefine(
  makeCheckoutRefine(true)
);

// PREVIEW: cukup titik lokasi untuk hitung ongkir (tanpa simpan apa pun).
// requestCakeDate dibuat opsional supaya ongkir bisa langsung tampil begitu
// user pin lokasi, meskipun tanggal kue belum dipilih.
export const previewSchema = checkoutBaseSchema
  .extend({
    requestCakeDate: z.coerce
      .date({ message: 'requestCakeDate tidak valid' })
      .optional(),
  })
  .superRefine(makeCheckoutRefine(false));

export const orderIdParamSchema = z.object({
  id: z.string().uuid('Format id tidak valid'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
});