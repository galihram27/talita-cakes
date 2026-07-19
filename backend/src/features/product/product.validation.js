import { z } from 'zod';
import {
  PRODUCT_CATEGORIES,
  TYPE5_SUBCATEGORIES,
  ALL_TYPE5_SUBCATEGORIES,
} from './product.constant.js';
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

// category wajib diisi dan harus salah satu dari daftar kategori milik type tsb
const categoryFieldFor = (type) =>
  z
    .string()
    .trim()
    .min(1, 'Category wajib diisi')
    .refine((c) => PRODUCT_CATEGORIES[type].includes(c), {
      message: `Category tidak valid untuk ${type}`,
    });

const baseFields = {
  name: z.string().trim().min(1, 'Nama wajib diisi'),
  description: z.string().trim().min(1, 'Deskripsi wajib diisi'),
  descriptionEn: z.string().trim().min(1, 'Deskripsi (English) wajib diisi'),
  // satu produk bisa punya banyak foto; elemen pertama dipakai sebagai cover.
  // cover (Product.image) di-derive dari images[0] di service layer.
  images: z
    .array(z.string().trim().min(1, 'Image tidak boleh kosong'))
    .min(1, 'Minimal 1 gambar wajib diunggah'),
  discount: z.coerce.number().min(0).max(100).optional().default(0),
};

// ===== BASE FIELDS UNTUK UPDATE (semua opsional, TIDAK ada default) =====
// PENTING: discount tidak boleh punya .default(0), karena kalau admin
// tidak mengirim discount sama sekali, ia tidak boleh ter-overwrite jadi 0.
const partialBaseFields = {
  name: z.string().trim().min(1, 'Nama tidak boleh kosong').optional(),
  description: z.string().trim().min(1, 'Deskripsi tidak boleh kosong').optional(),
  descriptionEn: z.string().trim().min(1, 'Deskripsi (English) tidak boleh kosong').optional(),
  images: z
    .array(z.string().trim().min(1, 'Image tidak boleh kosong'))
    .min(1, 'Minimal 1 gambar wajib diunggah')
    .optional(),
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

// ===== TYPE 1 (semua fixed: shape, size, flavor) =====
const type1Schema = z.object({
  type: z.literal('TYPE1'),
  ...baseFields,
  category: categoryFieldFor('TYPE1'),
  flavor: z.string().trim().min(1, 'Flavor wajib diisi'),
  shape: z.enum(['ROUND', 'SQUARE']),
  size: z.coerce.number().int(),
  price: z.coerce.number().positive('Price harus lebih dari 0'),
}).refine((data) => isValidManualSize(data.size), {
  message: 'Size harus berupa angka bulat positif',
  path: ['size'],
});

// ===== TYPE 2 (shape & size fixed seperti TYPE1, tanpa flavor karena user pilih sendiri) =====
const type2Schema = z.object({
  type: z.literal('TYPE2'),
  ...baseFields,
  category: categoryFieldFor('TYPE2'),
  shape: z.enum(['ROUND', 'SQUARE']),
  size: z.coerce.number().int(),
  price: z.coerce.number().positive('Price harus lebih dari 0'),
}).refine((data) => isValidManualSize(data.size), {
  message: 'Size harus berupa angka bulat positif',
  path: ['size'],
});

// ===== TYPE 3 (flavor fixed, user pilih shape & size) =====
const type3Schema = z.object({
  type: z.literal('TYPE3'),
  ...baseFields,
  category: categoryFieldFor('TYPE3'),
  flavor: z.string().trim().min(1, 'Flavor wajib diisi'),
  variants: z.array(variantSchema).min(2, 'Minimal harus ada size Round dan Square'),
}).superRefine(refineVariantsCompleteness);

// ===== TYPE 4 (user pilih shape & size + flavor + dekorasi, tanpa flavor fixed) =====
const type4Schema = z.object({
  type: z.literal('TYPE4'),
  ...baseFields,
  category: categoryFieldFor('TYPE4'),
  variants: z.array(variantSchema).min(2, 'Minimal harus ada size Round dan Square'),
}).superRefine(refineVariantsCompleteness);

// refine subcategory TYPE5: harus salah satu sub-kategori milik category-nya.
const refineType5Subcategory = (data, ctx) => {
  const allowed = TYPE5_SUBCATEGORIES[data.category] ?? [];
  if (!allowed.includes(data.subcategory)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Subcategory tidak valid untuk kategori ${data.category}`,
      path: ['subcategory'],
    });
  }
};

// ===== TYPE 5 (non-cake: flavor fixed, tanpa shape/size, harga tunggal) =====
// User hanya mengisi note & quantity saat order.
const type5Schema = z.object({
  type: z.literal('TYPE5'),
  ...baseFields,
  category: categoryFieldFor('TYPE5'),
  subcategory: z.string().trim().min(1, 'Subcategory wajib diisi'),
  flavor: z.string().trim().min(1, 'Flavor wajib diisi'),
  price: z.coerce.number().positive('Price harus lebih dari 0'),
}).superRefine(refineType5Subcategory);

export const createProductSchema = z.discriminatedUnion('type', [
  type1Schema,
  type2Schema,
  type3Schema,
  type4Schema,
  type5Schema,
]);

// ===== UPDATE SCHEMAS (semua field opsional, partial update) =====

// TYPE1: admin boleh kirim sebagian saja, misal cuma { price: 60000 }
const updateType1Schema = z.object({
  ...partialBaseFields,
  category: categoryFieldFor('TYPE1').optional(),
  flavor: z.string().trim().min(1, 'Flavor tidak boleh kosong').optional(),
  shape: z.enum(['ROUND', 'SQUARE']).optional(),
  size: z.coerce.number().int().optional(),
  price: z.coerce.number().positive('Price harus lebih dari 0').optional(),
}).refine((data) => data.size === undefined || isValidManualSize(data.size), {
  message: 'Size harus berupa angka bulat positif',
  path: ['size'],
});

// TYPE2: sama seperti TYPE1 tapi tanpa flavor (user pilih flavor sendiri saat order)
const updateType2Schema = z.object({
  ...partialBaseFields,
  category: categoryFieldFor('TYPE2').optional(),
  shape: z.enum(['ROUND', 'SQUARE']).optional(),
  size: z.coerce.number().int().optional(),
  price: z.coerce.number().positive('Price harus lebih dari 0').optional(),
}).refine((data) => data.size === undefined || isValidManualSize(data.size), {
  message: 'Size harus berupa angka bulat positif',
  path: ['size'],
});

// TYPE3: variants & removeVariants opsional -> admin boleh hanya update beberapa size saja
const updateType3Schema = z.object({
  ...partialBaseFields,
  category: categoryFieldFor('TYPE3').optional(),
  flavor: z.string().trim().min(1, 'Flavor tidak boleh kosong').optional(),
  variants: z.array(variantSchema).optional(),
  removeVariants: z.array(removeVariantSchema).optional(),
});

// TYPE4: sama seperti TYPE3 tapi tanpa flavor
const updateType4Schema = z.object({
  ...partialBaseFields,
  category: categoryFieldFor('TYPE4').optional(),
  variants: z.array(variantSchema).optional(),
  removeVariants: z.array(removeVariantSchema).optional(),
});

// TYPE5: semua opsional (partial update). Harga tunggal, tanpa shape/size.
const updateType5Schema = z
  .object({
    ...partialBaseFields,
    category: categoryFieldFor('TYPE5').optional(),
    subcategory: z.string().trim().min(1, 'Subcategory tidak boleh kosong').optional(),
    flavor: z.string().trim().min(1, 'Flavor tidak boleh kosong').optional(),
    price: z.coerce.number().positive('Price harus lebih dari 0').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.subcategory === undefined) return;
    // kalau category ikut dikirim, subcategory harus cocok dengan category itu;
    // kalau tidak, cukup pastikan subcategory adalah sub-kategori TYPE5 yang sah.
    const allowed = data.category
      ? TYPE5_SUBCATEGORIES[data.category] ?? []
      : ALL_TYPE5_SUBCATEGORIES;
    if (!allowed.includes(data.subcategory)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Subcategory tidak valid',
        path: ['subcategory'],
      });
    }
  });

export const updateProductSchemaMap = {
  TYPE1: updateType1Schema,
  TYPE2: updateType2Schema,
  TYPE3: updateType3Schema,
  TYPE4: updateType4Schema,
  TYPE5: updateType5Schema,
};