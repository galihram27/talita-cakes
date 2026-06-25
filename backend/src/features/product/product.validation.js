import { z } from 'zod';
import {
  isValidSize,
  isValidManualSize,
  hasRoundAndSquare,
  hasDuplicateVariant,
  validateAllVariantsCompleteness,
} from './product.helper.js';

/**
 * Validasi untuk parameter ID produk (harus format UUID).
 */
export const productIdParamSchema = z.object({
  id: z.string().uuid('Format id tidak valid'),
});

const baseFields = {
  name: z.string().trim().min(1, 'Nama wajib diisi'),
  description: z.string().trim().min(1, 'Deskripsi wajib diisi'),
  image: z.string().trim().min(1, 'Image wajib diisi'),
  discount: z.coerce.number().min(0).max(100).optional().default(0),
};

// ===== BASE FIELDS UNTUK UPDATE (semua opsional, TIDAK ada default) =====
// PENTING: discount tidak boleh punya .default(0), karena kalau admin
// tidak mengirim discount sama sekali, ia tidak boleh ter-overwrite jadi 0.
const partialBaseFields = {
  name: z.string().trim().min(1, 'Nama tidak boleh kosong').optional(),
  description: z.string().trim().min(1, 'Deskripsi tidak boleh kosong').optional(),
  image: z.string().trim().min(1, 'Image tidak boleh kosong').optional(),
  discount: z.coerce.number().min(0).max(100).optional(),
};

const variantSchema = z
  .object({
    shape: z.enum(['ROUND', 'SQUARE'], { message: 'Shape harus ROUND atau SQUARE' }),
    size: z.coerce.number().int(),
    price: z.coerce.number().positive('Price harus lebih dari 0'),
  })
  .refine((v) => isValidSize(v.shape, v.size), {
    message: 'Size tidak valid untuk shape tersebut',
    path: ['size'],
  });

const removeVariantSchema = z.object({
  shape: z.enum(['ROUND', 'SQUARE']),
  size: z.coerce.number().int(),
});

// helper refine untuk dipakai berulang di type2 & type3
const refineVariantsCompleteness = (data, ctx) => {
  if (!hasRoundAndSquare(data.variants)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Wajib mengisi minimal satu size Round dan satu size Square',
      path: ['variants'],
    });
    return;
  }

  if (hasDuplicateVariant(data.variants)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Terdapat duplikat shape+size pada variants',
      path: ['variants'],
    });
    return;
  }

  const result = validateAllVariantsCompleteness(data.variants);
  if (!result.valid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.message,
      path: ['variants'],
    });
  }
};

// ===== TYPE 1 =====
const type1Schema = z.object({
  type: z.literal('TYPE1'),
  ...baseFields,
  flavor: z.string().trim().min(1, 'Flavor wajib diisi'),
  shape: z.enum(['ROUND', 'SQUARE']),
  size: z.coerce.number().int(),
  price: z.coerce.number().positive('Price harus lebih dari 0'),
}).refine((data) => isValidManualSize(data.size), {
  message: 'Size harus berupa angka bulat positif',
  path: ['size'],
});

// ===== TYPE 2 =====
const type2Schema = z.object({
  type: z.literal('TYPE2'),
  ...baseFields,
  flavor: z.string().trim().min(1, 'Flavor wajib diisi'),
  variants: z.array(variantSchema).min(2, 'Minimal harus ada size Round dan Square'),
}).superRefine(refineVariantsCompleteness);

// ===== TYPE 3 =====
const type3Schema = z.object({
  type: z.literal('TYPE3'),
  ...baseFields,
  variants: z.array(variantSchema).min(2, 'Minimal harus ada size Round dan Square'),
}).superRefine(refineVariantsCompleteness);

export const createProductSchema = z.discriminatedUnion('type', [
  type1Schema,
  type2Schema,
  type3Schema,
]);

// ===== UPDATE SCHEMAS (semua field opsional, partial update) =====

// TYPE1: admin boleh kirim sebagian saja, misal cuma { price: 60000 }
const updateType1Schema = z.object({
  ...partialBaseFields,
  flavor: z.string().trim().min(1, 'Flavor tidak boleh kosong').optional(),
  shape: z.enum(['ROUND', 'SQUARE']).optional(),
  size: z.coerce.number().int().optional(),
  price: z.coerce.number().positive('Price harus lebih dari 0').optional(),
}).refine((data) => data.size === undefined || isValidManualSize(data.size), {
  message: 'Size harus berupa angka bulat positif',
  path: ['size'],
});

// TYPE2: variants & removeVariants opsional -> admin boleh hanya update beberapa size saja
const updateType2Schema = z.object({
  ...partialBaseFields,
  flavor: z.string().trim().min(1, 'Flavor tidak boleh kosong').optional(),
  variants: z.array(variantSchema).optional(),
  removeVariants: z.array(removeVariantSchema).optional(),
});

// TYPE3: sama seperti TYPE2 tapi tanpa flavor
const updateType3Schema = z.object({
  ...partialBaseFields,
  variants: z.array(variantSchema).optional(),
  removeVariants: z.array(removeVariantSchema).optional(),
});

export const updateProductSchemaMap = {
  TYPE1: updateType1Schema,
  TYPE2: updateType2Schema,
  TYPE3: updateType3Schema,
};