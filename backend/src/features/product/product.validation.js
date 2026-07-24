import { z } from 'zod';
import {
  PRODUCT_CATEGORIES,
  TYPE5_SUBCATEGORIES,
  ALL_TYPE5_SUBCATEGORIES,
  type5SizeConfig,
  cupcakeBoxesForCategory,
  isFixedFlavorCupcake,
  isGoodiebagCupcake,
  goodiebagSubcategories,
  isGoodiebagSubcategory,
  usesFilling,
  usesTopping,
  CINROLLS_VAN_DEPOK,
  MAX_FILLING_OPTIONS,
  MAX_TOPPING_OPTIONS,
  MAX_TOPPING_SELECT,
  isBreadCategory,
  BREAD_SIZE_KEYS,
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
  // flag "pajang di Home" — bisa di-toggle sendiri via panel admin
  featured: z.boolean().optional(),
};

const variantSchema = z
  .object({
    shape: z.enum(['ROUND', 'SQUARE'], { message: 'Shape harus ROUND atau SQUARE' }),
    size: z.coerce.number().int(),
    price: z.coerce.number().positive('Price harus lebih dari 0'),
    // foto yang mewakili varian ini. Untuk TYPE3/TYPE4 admin memilih satu foto
    // per BENTUK, lalu foto itu dilekatkan ke semua ukuran bentuk tsb.
    image: z.string().trim().min(1).optional(),
  })
  .refine((v) => isValidSize(v.shape, v.size), {
    message: 'Size tidak valid untuk shape tersebut',
    path: ['size'],
  });

/**
 * Foto varian harus benar-benar ada di galeri produk, supaya tidak menunjuk
 * URL yang sudah dihapus. Saat update parsial `images` bisa tidak dikirim —
 * dalam kasus itu pengecekan dilewati karena galeri lama tidak ikut terbawa.
 */
const refineVariantImages = (data, ctx) => {
  if (!Array.isArray(data.images)) return;

  // Varian bershape (TYPE2/TYPE3) & ukuran bread sama-sama boleh punya foto
  // khusus; keduanya harus menunjuk foto yang benar-benar ada di galeri.
  const withImage = [...(data.variants ?? []), ...(data.breadSizes ?? [])];
  const orphan = withImage.find(
    (v) => v.image && !data.images.includes(v.image)
  );
  if (orphan) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Foto varian harus salah satu foto produk yang diunggah',
      path: ['variants'],
    });
  }
};

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
}).superRefine((data, ctx) => {
  refineVariantsCompleteness(data, ctx);
  refineVariantImages(data, ctx);
});

// ===== TYPE 4 (user pilih shape & size + flavor + dekorasi, tanpa flavor fixed) =====
const type4Schema = z.object({
  type: z.literal('TYPE4'),
  ...baseFields,
  category: categoryFieldFor('TYPE4'),
  variants: z.array(variantSchema).min(2, 'Minimal harus ada size Round dan Square'),
}).superRefine((data, ctx) => {
  refineVariantsCompleteness(data, ctx);
  refineVariantImages(data, ctx);
});

// refine subcategory TYPE5: kategori yang punya sub-kategori wajib mengisi salah
// satu dari daftarnya; kategori tanpa sub-kategori (mis. Mozzarella Sausage Rolls)
// justru tidak boleh mengirim subcategory.
const refineType5Subcategory = (data, ctx) => {
  const allowed = TYPE5_SUBCATEGORIES[data.category] ?? [];
  if (allowed.length === 0) {
    if (data.subcategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Kategori ${data.category} tidak memiliki subcategory`,
        path: ['subcategory'],
      });
    }
    return;
  }
  if (!data.subcategory) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Subcategory wajib diisi',
      path: ['subcategory'],
    });
  } else if (!allowed.includes(data.subcategory)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Subcategory tidak valid untuk kategori ${data.category}`,
      path: ['subcategory'],
    });
  }
};

// TYPE5 (non-cake) memakai shape + size yang diinput admin:
// - ROUND: satu ukuran (size), mis. 20 -> "20 cm".
// - SQUARE: dua ukuran (size x sizeB), mis. 20x10.
const refineType5Size = (data, ctx) => {
  if (data.size !== undefined && !isValidManualSize(data.size)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Size harus berupa angka bulat positif',
      path: ['size'],
    });
  }
  if (data.shape === 'SQUARE') {
    if (!isValidManualSize(data.sizeB)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Untuk Square, isi kedua ukuran (mis. 20 x 10)',
        path: ['sizeB'],
      });
    }
  } else if (data.shape === 'ROUND' && data.sizeB !== undefined && data.sizeB !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Round hanya memakai satu ukuran',
      path: ['sizeB'],
    });
  }
};

// Varian per-size untuk sub-kategori TYPE5 yang size-nya dipilih user (Basque).
const type5SizeVariantSchema = z.object({
  size: z.coerce.number().int().positive(),
  price: z.coerce.number().positive('Price harus lebih dari 0'),
});

// Ukuran Bread (Personal/Family/Sharing): admin hanya mengisi harga per key;
// dimensinya sudah ditentukan (lihat BREAD_SIZES di constant).
const breadSizeSchema = z.object({
  key: z.enum(BREAD_SIZE_KEYS, { message: 'Ukuran bread tidak valid' }),
  price: z.coerce.number().positive('Price harus lebih dari 0'),
  // foto khusus ukuran ini (dipilih dari Product.images) — opsional.
  image: z.string().trim().min(1).optional(),
});

// ===== FILLING (khusus CINROLLS VAN DEPOK) — pilih SATU, tanpa harga =====
// Harga ada di comboPrices (per kombinasi filling + topping), bukan di sini.
const fillingOptionSchema = z.object({
  name: z.string().trim().min(1, 'Nama filling wajib diisi'),
});

// Konfigurasi filling: daftar opsi (nama saja, maks 6) + opsi default yang
// dipakai otomatis kalau user tidak memilih. Selalu pilih satu (radio).
const fillingConfigSchema = z
  .object({
    options: z
      .array(fillingOptionSchema)
      .min(1, 'Minimal satu pilihan filling')
      .max(MAX_FILLING_OPTIONS, `Maksimal ${MAX_FILLING_OPTIONS} pilihan filling`),
    defaultIndex: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((data, ctx) => {
    const names = data.options.map((o) => o.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nama pilihan filling tidak boleh sama',
        path: ['options'],
      });
    }
    if (data.defaultIndex >= data.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pilihan filling default tidak valid',
        path: ['defaultIndex'],
      });
    }
  });

// ===== HARGA KOMBINASI (filling + topping) — CINROLLS VAN DEPOK =====
// Tiap baris: harga TAMBAHAN saat filling & topping ini dipasangkan.
const comboPriceSchema = z.object({
  filling: z.string().trim().min(1, 'Filling kombinasi wajib diisi'),
  topping: z.string().trim().min(1, 'Topping kombinasi wajib diisi'),
  price: z.coerce.number().min(0, 'Harga kombinasi tidak boleh negatif').default(0),
});
const comboPricesSchema = z.array(comboPriceSchema);

// ===== TOPPING (khusus CINROLLS VAN DEPOK) — wajib pilih min 1, tanpa harga =====
const toppingOptionSchema = z.object({
  name: z.string().trim().min(1, 'Nama topping wajib diisi'),
});

// Konfigurasi topping: daftar opsi (nama saja) + batas jumlah pilihan user.
const toppingConfigSchema = z
  .object({
    options: z
      .array(toppingOptionSchema)
      .min(1, 'Minimal satu pilihan topping')
      .max(MAX_TOPPING_OPTIONS, `Maksimal ${MAX_TOPPING_OPTIONS} pilihan topping`),
    maxSelect: z.coerce.number().int().min(1).max(MAX_TOPPING_SELECT).default(1),
  })
  .superRefine((data, ctx) => {
    const names = data.options.map((o) => o.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nama pilihan topping tidak boleh sama',
        path: ['options'],
      });
    }
    if (data.maxSelect > data.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Batas jumlah pilihan melebihi jumlah opsi topping',
        path: ['maxSelect'],
      });
    }
  });

// Filling/topping hanya boleh dikirim untuk sub-kategori CINROLLS VAN DEPOK.
// Saat update, subcategory bisa tidak dikirim — dalam kasus itu lewati cek di
// sini; service layer yang memastikan keduanya hanya tersimpan bila subcategory
// efektif produk memang CINROLLS VAN DEPOK.
const refineFilling = (data, ctx) => {
  if (data.filling === undefined || data.filling === null) return;
  if (data.subcategory !== undefined && !usesFilling(data.subcategory)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Filling hanya tersedia untuk ${CINROLLS_VAN_DEPOK}`,
      path: ['filling'],
    });
  }
};

const refineTopping = (data, ctx) => {
  if (data.topping === undefined || data.topping === null) return;
  if (data.subcategory !== undefined && !usesTopping(data.subcategory)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Topping hanya tersedia untuk ${CINROLLS_VAN_DEPOK}`,
      path: ['topping'],
    });
  }
};

// Harga kombinasi hanya untuk cinrolls; pasangan (filling, topping) tidak boleh
// ganda; dan bila config filling & topping ikut dikirim, referensinya harus valid.
const refineComboPrices = (data, ctx) => {
  if (data.comboPrices === undefined || data.comboPrices === null) return;
  if (data.subcategory !== undefined && !usesFilling(data.subcategory)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Harga kombinasi hanya tersedia untuk ${CINROLLS_VAN_DEPOK}`,
      path: ['comboPrices'],
    });
    return;
  }
  // pasangan (filling, topping) unik
  const seen = new Set();
  for (const c of data.comboPrices) {
    const key = `${c.filling} ${c.topping}`;
    if (seen.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Kombinasi ganda: ${c.filling} + ${c.topping}`,
        path: ['comboPrices'],
      });
    }
    seen.add(key);
  }
  // referensi harus menunjuk opsi filling & topping yang ada (kalau ikut dikirim)
  const fillingNames = data.filling?.options?.map((o) => o.name);
  const toppingNames = data.topping?.options?.map((o) => o.name);
  if (fillingNames && toppingNames) {
    for (const c of data.comboPrices) {
      if (!fillingNames.includes(c.filling)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Filling kombinasi tidak dikenal: ${c.filling}`,
          path: ['comboPrices'],
        });
      }
      if (!toppingNames.includes(c.topping)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Topping kombinasi tidak dikenal: ${c.topping}`,
          path: ['comboPrices'],
        });
      }
    }
  }
};

// Cabang sizing TYPE5: sub-kategori size-pilihan pakai `variants` (harga per
// size); sub-kategori lain pakai shape+size tunggal input admin.
const refineType5Sizing = (data, ctx) => {
  // Bread: user memilih ukuran bernama (Personal/Family/Sharing); admin isi
  // harga per ukuran. Minimal satu ukuran diberi harga, tanpa key ganda.
  if (isBreadCategory(data.category)) {
    const sizes = data.breadSizes ?? [];
    if (sizes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Isi harga minimal satu ukuran',
        path: ['breadSizes'],
      });
      return;
    }
    const keys = sizes.map((s) => s.key);
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Terdapat ukuran duplikat',
        path: ['breadSizes'],
      });
    }
    return;
  }

  const cfg = type5SizeConfig(data.subcategory);
  if (cfg) {
    const variants = data.variants ?? [];
    if (variants.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Isi harga minimal satu ukuran',
        path: ['variants'],
      });
      return;
    }
    const sizes = variants.map((v) => v.size);
    if (sizes.some((s) => !cfg.sizes.includes(s))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Ukuran tidak valid untuk ${data.subcategory}. Pilihan: ${cfg.sizes.join(', ')}`,
        path: ['variants'],
      });
    }
    if (new Set(sizes).size !== sizes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Terdapat ukuran duplikat',
        path: ['variants'],
      });
    }
    return;
  }
  // sub-kategori biasa: shape + size tunggal wajib
  if (!data.shape) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Shape wajib diisi', path: ['shape'] });
  }
  if (data.size === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Size wajib diisi', path: ['size'] });
  }
  if (!(data.price > 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Price harus lebih dari 0', path: ['price'] });
  }
  refineType5Size(data, ctx);
};

// ===== TYPE 5 (non-cake: flavor fixed, harga tunggal) =====
// Sebagian besar sub-kategori: shape+size tunggal input admin. Sub-kategori
// tertentu (Basque): user memilih size, harga per size (pakai `variants`).
const type5Schema = z.object({
  type: z.literal('TYPE5'),
  ...baseFields,
  category: categoryFieldFor('TYPE5'),
  // opsional di skema; wajib/tidaknya ditentukan per-kategori di refine di atas
  subcategory: z.string().trim().min(1, 'Subcategory tidak boleh kosong').optional(),
  flavor: z.string().trim().min(1, 'Flavor wajib diisi'),
  // single-variant (sub-kategori biasa) — opsional, diwajibkan di refineType5Sizing
  shape: z.enum(['ROUND', 'SQUARE']).optional(),
  size: z.coerce.number().int().optional(),
  sizeB: z.coerce.number().int().optional(),
  price: z.coerce.number().positive('Price harus lebih dari 0').optional(),
  // per-size (sub-kategori size-pilihan)
  variants: z.array(type5SizeVariantSchema).optional(),
  // harga per ukuran Bread (Personal/Family/Sharing)
  breadSizes: z.array(breadSizeSchema).optional(),
  // pilihan filling & topping + harga kombinasi (hanya CINROLLS VAN DEPOK) — opsional
  filling: fillingConfigSchema.nullish(),
  topping: toppingConfigSchema.nullish(),
  comboPrices: comboPricesSchema.nullish(),
}).superRefine((data, ctx) => {
  refineType5Subcategory(data, ctx);
  refineType5Sizing(data, ctx);
  refineFilling(data, ctx);
  refineTopping(data, ctx);
  refineComboPrices(data, ctx);
});

// ===== TYPE 6 (cupcakes: harga per isi box, rasa tergantung kategori) =====
// Varian cupcake memakai ProductVariant.size sebagai ISI BOX (tanpa shape).
const boxVariantSchema = z.object({
  // isi box (pcs). Opsional karena kategori goodiebag tidak punya pilihan isi box
  // (harga tunggal per box); size divalidasi per-kategori di refineCupcakeBoxes.
  size: z.coerce.number().int().positive().optional(),
  price: z.coerce.number().positive('Price harus lebih dari 0'),
  // foto yang mewakili isi box ini; harus salah satu foto produk (lihat refine di bawah)
  image: z.string().trim().min(1).optional(),
});

// Box yang dikirim harus termasuk pilihan box milik kategori tsb, tanpa duplikat,
// dan minimal satu box diisi. Kategori goodiebag berbeda: tepat satu varian
// (harga tunggal per box), tanpa isi box.
const refineCupcakeBoxes = (data, ctx) => {
  const variants = data.variants ?? [];

  if (isGoodiebagCupcake(data.category)) {
    if (variants.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.category} hanya boleh punya satu harga box`,
        path: ['variants'],
      });
    }
    return;
  }

  const allowed = cupcakeBoxesForCategory(data.category);
  const sizes = variants.map((v) => v.size);

  if (sizes.some((s) => s === undefined)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Isi box wajib diisi untuk ${data.category}`,
      path: ['variants'],
    });
  }

  const invalid = sizes.filter((s) => s !== undefined && !allowed.includes(s));
  if (invalid.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Isi box tidak valid untuk ${data.category}. Pilihan: ${allowed.join(', ')}`,
      path: ['variants'],
    });
  }

  if (new Set(sizes).size !== sizes.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Terdapat isi box duplikat',
      path: ['variants'],
    });
  }

};

// Rasa fixed hanya wajib untuk kategori ber-fixedFlavor (American Butter).
const refineCupcakeFlavor = (data, ctx) => {
  if (!isFixedFlavorCupcake(data.category)) return;
  if (!data.flavor) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Flavor wajib diisi untuk ${data.category}`,
      path: ['flavor'],
    });
  }
};

// Sub-kategori hanya untuk kategori goodiebag; wajib & harus salah satu sub-kat
// goodiebag yang sah. Kategori TYPE6 lain tidak boleh mengirim subcategory.
const refineCupcakeSubcategory = (data, ctx) => {
  if (isGoodiebagCupcake(data.category)) {
    if (!data.subcategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Subcategory wajib diisi untuk Goodiebag Cupcakes',
        path: ['subcategory'],
      });
    } else if (!isGoodiebagSubcategory(data.subcategory)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Subcategory tidak valid. Pilihan: ${goodiebagSubcategories().join(', ')}`,
        path: ['subcategory'],
      });
    }
    return;
  }
  if (data.subcategory) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Kategori ${data.category} tidak memiliki subcategory`,
      path: ['subcategory'],
    });
  }
};

const type6Schema = z
  .object({
    type: z.literal('TYPE6'),
    ...baseFields,
    category: categoryFieldFor('TYPE6'),
    // hanya dipakai kategori ber-fixedFlavor; kategori lain user pilih saat order
    flavor: z.string().trim().min(1).optional(),
    // hanya dipakai kategori goodiebag (lihat refineCupcakeSubcategory)
    subcategory: z.string().trim().min(1).optional(),
    variants: z.array(boxVariantSchema).min(1, 'Minimal satu pilihan isi box wajib diisi'),
  })
  .superRefine((data, ctx) => {
    refineCupcakeBoxes(data, ctx);
    refineCupcakeFlavor(data, ctx);
    refineCupcakeSubcategory(data, ctx);
    refineVariantImages(data, ctx);
  });

export const createProductSchema = z.discriminatedUnion('type', [
  type1Schema,
  type2Schema,
  type3Schema,
  type4Schema,
  type5Schema,
  type6Schema,
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
const updateType3Schema = z
  .object({
    ...partialBaseFields,
    category: categoryFieldFor('TYPE3').optional(),
    flavor: z.string().trim().min(1, 'Flavor tidak boleh kosong').optional(),
    variants: z.array(variantSchema).optional(),
    removeVariants: z.array(removeVariantSchema).optional(),
  })
  .superRefine(refineVariantImages);

// TYPE4: sama seperti TYPE3 tapi tanpa flavor
const updateType4Schema = z
  .object({
    ...partialBaseFields,
    category: categoryFieldFor('TYPE4').optional(),
    variants: z.array(variantSchema).optional(),
    removeVariants: z.array(removeVariantSchema).optional(),
  })
  .superRefine(refineVariantImages);

// TYPE5: semua opsional (partial update). Harga tunggal + shape/size.
const updateType5Schema = z
  .object({
    ...partialBaseFields,
    category: categoryFieldFor('TYPE5').optional(),
    subcategory: z.string().trim().min(1, 'Subcategory tidak boleh kosong').optional(),
    flavor: z.string().trim().min(1, 'Flavor tidak boleh kosong').optional(),
    shape: z.enum(['ROUND', 'SQUARE']).optional(),
    size: z.coerce.number().int().optional(),
    sizeB: z.coerce.number().int().nullable().optional(),
    price: z.coerce.number().positive('Price harus lebih dari 0').optional(),
    variants: z.array(type5SizeVariantSchema).optional(),
    breadSizes: z.array(breadSizeSchema).optional(),
    // filling & topping + harga kombinasi (hanya CINROLLS VAN DEPOK); null = kosongkan
    filling: fillingConfigSchema.nullish(),
    topping: toppingConfigSchema.nullish(),
    comboPrices: comboPricesSchema.nullish(),
  })
  .superRefine((data, ctx) => {
    refineFilling(data, ctx);
    refineTopping(data, ctx);
    refineComboPrices(data, ctx);
    // Bread: kalau breadSizes dikirim, pastikan tidak ada key ganda.
    if (data.breadSizes !== undefined) {
      const keys = data.breadSizes.map((s) => s.key);
      if (new Set(keys).size !== keys.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Terdapat ukuran duplikat',
          path: ['breadSizes'],
        });
      }
    }
    // Basque dsb.: kalau variants dikirim, validasi ukuran terhadap config.
    if (data.variants !== undefined) {
      const cfg = type5SizeConfig(data.subcategory);
      if (!cfg) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'variants hanya untuk sub-kategori dengan pilihan ukuran',
          path: ['variants'],
        });
      } else {
        const sizes = data.variants.map((v) => v.size);
        if (data.variants.length === 0 || sizes.some((s) => !cfg.sizes.includes(s))) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Ukuran tidak valid. Pilihan: ${cfg.sizes.join(', ')}`,
            path: ['variants'],
          });
        }
        if (new Set(sizes).size !== sizes.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Terdapat ukuran duplikat',
            path: ['variants'],
          });
        }
      }
    }
    // hanya validasi ukuran tunggal kalau shape/size ikut dikirim (partial update)
    if (data.shape !== undefined || data.size !== undefined) {
      refineType5Size(data, ctx);
    }
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

// TYPE6: variants dikirim UTUH (bukan tambal-sulam) karena jumlah box bisa
// bertambah/berkurang; service akan mengganti seluruh varian sekaligus.
// Kalau variants dikirim, category wajib ikut supaya isi box bisa divalidasi
// terhadap kategori yang benar (kategori tidak bisa diambil dari body saja).
const updateType6Schema = z
  .object({
    ...partialBaseFields,
    category: categoryFieldFor('TYPE6').optional(),
    flavor: z.string().trim().min(1, 'Flavor tidak boleh kosong').optional(),
    subcategory: z.string().trim().min(1, 'Subcategory tidak boleh kosong').optional(),
    variants: z.array(boxVariantSchema).min(1, 'Minimal satu pilihan isi box').optional(),
  })
  .superRefine((data, ctx) => {
    // subcategory hanya divalidasi kalau dikirim; butuh category sbg konteks.
    if (data.subcategory !== undefined) {
      if (!data.category) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Category wajib dikirim bersama subcategory',
          path: ['category'],
        });
      } else {
        refineCupcakeSubcategory(data, ctx);
      }
    }
    if (data.variants === undefined) return;
    if (!data.category) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Category wajib dikirim bersama variants',
        path: ['category'],
      });
      return;
    }
    refineCupcakeBoxes(data, ctx);
    refineVariantImages(data, ctx);
  });

export const updateProductSchemaMap = {
  TYPE1: updateType1Schema,
  TYPE2: updateType2Schema,
  TYPE3: updateType3Schema,
  TYPE4: updateType4Schema,
  TYPE5: updateType5Schema,
  TYPE6: updateType6Schema,
};