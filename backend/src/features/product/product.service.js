import { AppError } from '../../utils/appError.js';
import * as productRepository from './product.repository.js';
import { updateProductSchemaMap } from './product.validation.js';
import { cached, cacheDeleteByPrefix } from '../../lib/cache.js';
import {
  isFixedFlavorCupcake,
  isGoodiebagCupcake,
  type5HasSubcategories,
  type5SizeConfig,
  usesFilling,
  usesTopping,
  isBreadCategory,
  breadSizeByKey,
} from './product.constant.js';

// Tipe/kategori yang menyimpan subcategory: TYPE5 (non-cake) & TYPE6 goodiebag.
const storesSubcategory = (type, category) =>
  type === 'TYPE5' || (type === 'TYPE6' && isGoodiebagCupcake(category));

// Tipe yang menyimpan flavor fixed di level produk. TYPE2 & TYPE4 tidak termasuk
// karena rasanya dipilih user saat order. TYPE6 tergantung kategori: hanya
// kategori ber-fixedFlavor (American Butter) yang rasanya ditentukan admin.
const storesFixedFlavor = (type, category) => {
  if (type === 'TYPE1' || type === 'TYPE3' || type === 'TYPE5') return true;
  if (type === 'TYPE6') return isFixedFlavorCupcake(category);
  return false;
};

// Semua key cache produk diawali prefix ini, supaya sekali invalidasi
// (cacheDeleteByPrefix) langsung membersihkan list, detail, dan count.
const PRODUCT_CACHE_PREFIX = 'product:';

// Dipanggil setiap kali data produk berubah (create/update/delete) supaya
// pembaca berikutnya mendapat data terbaru, bukan versi cache lama.
const invalidateProductCache = () => cacheDeleteByPrefix(PRODUCT_CACHE_PREFIX);

// helper: buang key yang value-nya undefined (field yang tidak dikirim admin)
const pickDefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

// helper: sinkronkan cover (image) dari images[0].
// Dipakai supaya konsumen lama yang masih baca `image` tetap dapat foto utama.
const withDerivedCover = (fields) => {
  if (Array.isArray(fields.images) && fields.images.length > 0) {
    return { ...fields, image: fields.images[0] };
  }
  return fields;
};

/**
 * Membuat produk baru beserta variannya berdasarkan tipe produk.
 */
export const createProduct = async (payload) => {
  const { type, name, description, descriptionEn, images, discount, flavor, category, subcategory } =
    payload;

  let variantsData = [];

  // TYPE1 & TYPE2: varian diambil langsung dari root payload (single variant fixed)
  if (type === 'TYPE1' || type === 'TYPE2') {
    variantsData = [
      { shape: payload.shape, size: payload.size, price: payload.price },
    ];
  } else if (type === 'TYPE5') {
    const sizeCfg = type5SizeConfig(payload.subcategory);
    if (isBreadCategory(category)) {
      // Bread: satu varian per ukuran bernama (dimensi tetap dari BREAD_SIZES).
      variantsData = payload.breadSizes.map((bs) => {
        const s = breadSizeByKey(bs.key);
        return { shape: s.shape, size: s.size, sizeB: s.sizeB, price: bs.price };
      });
    } else if (sizeCfg) {
      // Sub-kategori size-pilihan (Basque): satu varian per size, bentuk tetap.
      variantsData = payload.variants.map((v) => ({
        shape: sizeCfg.shape,
        size: v.size,
        sizeB: null,
        price: v.price,
      }));
    } else {
      // TYPE5 biasa: satu varian harga tunggal + shape & size dari admin.
      // ROUND -> size saja; SQUARE -> size x sizeB (dua dimensi).
      variantsData = [
        {
          shape: payload.shape,
          size: payload.size,
          sizeB: payload.shape === 'SQUARE' ? payload.sizeB : null,
          price: payload.price,
        },
      ];
    }
  } else if (type === 'TYPE6') {
    // TYPE6 (cupcakes): satu varian per isi box; size dipakai sebagai jumlah pcs.
    // Goodiebag tidak punya isi box -> size null (harga tunggal per box).
    variantsData = payload.variants.map((v) => ({
      shape: null,
      size: v.size ?? null,
      price: v.price,
      image: v.image ?? null,
    }));
  } else {
    // TYPE3 & TYPE4: varian berupa array yang di-mapping
    variantsData = payload.variants.map((v) => ({
      shape: v.shape,
      size: v.size,
      price: v.price,
      image: v.image ?? null,
    }));
  }

  // Simpan data produk dan varian ke repository
  const product = await productRepository.createProductWithVariants({
    type,
    name,
    description,
    descriptionEn,
    // cover di-sync dari foto pertama; images menyimpan seluruh galeri
    image: images[0],
    images,
    category,
    // subcategory: TYPE5 (kategori ber-subkategori) & TYPE6 goodiebag; lainnya null
    subcategory: storesSubcategory(type, category) ? subcategory ?? null : null,
    flavor: storesFixedFlavor(type, category) ? flavor : null,
    // filling & topping + harga kombinasi hanya untuk CINROLLS VAN DEPOK; lainnya null
    filling:
      type === 'TYPE5' && usesFilling(subcategory) ? payload.filling ?? null : null,
    topping:
      type === 'TYPE5' && usesTopping(subcategory) ? payload.topping ?? null : null,
    comboPrices:
      type === 'TYPE5' && usesFilling(subcategory) ? payload.comboPrices ?? null : null,
    discount,
    variants: {
      create: variantsData,
    },
  });

  invalidateProductCache();
  return product;
};

/**
 * Mengambil satu produk berdasarkan ID. Melempar error 404 jika tidak ada.
 */
export const getProductById = async (id) => {
  // cache detail per id; error 404 dilempar di luar cache supaya "tidak ada"
  // tidak ikut tersimpan.
  const product = await cached(`${PRODUCT_CACHE_PREFIX}one:${id}`, () =>
    productRepository.findProductById(id)
  );

  if (!product) {
    throw new AppError('Product tidak ditemukan', 404);
  }

  return product;
};

/**
 * Mengambil semua daftar produk yang tersedia.
 * Opsional: difilter berdasarkan category (untuk filter di halaman Menu).
 */
export const getAllProducts = async (category) => {
  // key dibedakan per category; tanpa filter memakai penanda "all".
  return cached(`${PRODUCT_CACHE_PREFIX}all:${category ?? 'all'}`, () =>
    productRepository.findAllProducts(category)
  );
};

/**
 * Menghitung jumlah produk (opsional difilter category).
 */
export const getProductCount = async (category) => {
  return cached(`${PRODUCT_CACHE_PREFIX}count:${category ?? 'all'}`, () =>
    productRepository.countProducts(category)
  );
};

/**
 * Mencari produk berdasarkan keyword (nama, description, atau flavor).
 */
export const searchProducts = async (keyword) => {
  if (!keyword || keyword.trim() === '') {
    throw new AppError('Keyword pencarian wajib diisi', 400);
  }

  return productRepository.searchProductsByKeyword(keyword.trim());
};

/**
 * Memperbarui data produk dan memperbarui ulang seluruh variannya.
 */
export const updateProduct = async (id, body) => {
  const existing = await productRepository.findProductById(id);

  if (!existing) {
    throw new AppError('Product tidak ditemukan', 404);
  }

  const type = existing.type; // type diambil dari DB, tidak bisa diganti
  const schema = updateProductSchemaMap[type];

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('Validasi gagal', 422, parsed.error.flatten());
  }

  const payload = parsed.data;

  // TYPE1/TYPE2/TYPE5: 1 variant · TYPE6: varian box diganti utuh ·
  // TYPE3/TYPE4: grid variant shape+size
  let updated;
  if (type === 'TYPE5' && payload.breadSizes !== undefined) {
    // Bread: varian per ukuran bernama diganti utuh
    updated = await updateBreadSizes(id, existing, payload);
  } else if (type === 'TYPE5' && payload.variants !== undefined) {
    // TYPE5 size-pilihan (Basque): varian per-size diganti utuh
    updated = await updateType5SizeType(id, existing, payload);
  } else if (type === 'TYPE1' || type === 'TYPE2' || type === 'TYPE5') {
    updated = await updateSingleVariantType(id, existing, payload);
  } else if (type === 'TYPE6') {
    updated = await updateCupcakeType(id, existing, payload);
  } else {
    updated = await updateVariantGridType(id, payload);
  }

  invalidateProductCache();
  return updated;
};

// TYPE1 & TYPE2: produk dengan 1 variant fixed
const updateSingleVariantType = async (id, existing, payload) => {
  const { shape, size, sizeB, price, ...rest } = payload;
  // kalau images dikirim, cover (image) ikut di-update dari images[0]
  const productFields = withDerivedCover(pickDefined(rest));

  // TYPE5: kalau kategori efektifnya tidak punya sub-kategori (mis. Mozzarella
  // Sausage Rolls), pastikan subcategory dikosongkan supaya tidak menyisakan
  // nilai lama dari kategori sebelumnya.
  if (existing.type === 'TYPE5') {
    const category = productFields.category ?? existing.category;
    if (!type5HasSubcategories(category)) productFields.subcategory = null;
    // filling & topping hanya untuk CINROLLS VAN DEPOK; kosongkan kalau
    // subcategory efektifnya bukan itu (mis. admin memindah ke sub-kategori lain).
    const subcategory =
      productFields.subcategory !== undefined
        ? productFields.subcategory
        : existing.subcategory;
    if (!usesFilling(subcategory)) {
      productFields.filling = null;
      productFields.comboPrices = null;
    }
    if (!usesTopping(subcategory)) productFields.topping = null;
  }

  const existingVariant = existing.variants[0];

  // hanya bikin object update variant kalau ada salah satu field varian dikirim
  let variantFields = null;
  if (
    shape !== undefined ||
    size !== undefined ||
    sizeB !== undefined ||
    price !== undefined
  ) {
    const nextShape = shape ?? existingVariant.shape;
    variantFields = {
      shape: nextShape,
      size: size ?? existingVariant.size,
      price: price ?? existingVariant.price,
    };
    // sizeB hanya bermakna untuk SQUARE; ROUND selalu null. Kalau shape dikirim,
    // ikut set sizeB dari payload (SQUARE) atau kosongkan (ROUND).
    if (shape !== undefined) {
      variantFields.sizeB = nextShape === 'SQUARE' ? sizeB ?? null : null;
    } else if (sizeB !== undefined) {
      variantFields.sizeB = sizeB;
    }
  }

  return productRepository.updateType1ProductPartial(
    id,
    productFields,
    existingVariant.id,
    variantFields
  );
};

// Bread: varian per ukuran bernama (Personal/Family/Sharing) diganti seluruhnya.
// filling/topping/comboPrices ikut lewat productFields (untuk Cinrolls).
const updateBreadSizes = async (id, existing, payload) => {
  const { breadSizes, variants, ...rest } = payload;
  const productFields = withDerivedCover(pickDefined(rest));

  // filling/topping/combo hanya untuk CINROLLS VAN DEPOK; kosongkan kalau bukan.
  const subcategory =
    productFields.subcategory !== undefined
      ? productFields.subcategory
      : existing.subcategory;
  if (!usesFilling(subcategory)) {
    productFields.filling = null;
    productFields.comboPrices = null;
  }
  if (!usesTopping(subcategory)) productFields.topping = null;

  const variantsData = (breadSizes || []).map((bs) => {
    const s = breadSizeByKey(bs.key);
    return { shape: s.shape, size: s.size, sizeB: s.sizeB, price: bs.price };
  });

  return productRepository.replaceProductVariants(id, productFields, variantsData);
};

// TYPE5 size-pilihan (Basque): varian per-size diganti seluruhnya.
const updateType5SizeType = async (id, existing, payload) => {
  const { variants, ...rest } = payload;
  const productFields = withDerivedCover(pickDefined(rest));

  const subcategory = payload.subcategory ?? existing.subcategory;
  const sizeCfg = type5SizeConfig(subcategory);
  const variantsData = (variants || []).map((v) => ({
    shape: sizeCfg?.shape ?? 'ROUND',
    size: v.size,
    price: v.price,
  }));

  return productRepository.replaceProductVariants(id, productFields, variantsData);
};

// TYPE6 (cupcakes): varian box diganti seluruhnya kalau admin mengirim variants.
const updateCupcakeType = async (id, existing, payload) => {
  const { variants, ...rest } = payload;
  const productFields = withDerivedCover(pickDefined(rest));

  // Kategori bisa berubah (mis. Simple Decor -> American Butter), sehingga
  // status "rasa fixed" ikut berubah. Kalau kategori barunya TIDAK fixed,
  // flavor lama harus dikosongkan supaya tidak tertinggal sebagai data hantu.
  const category = payload.category ?? existing.category;
  if (!storesFixedFlavor('TYPE6', category)) {
    productFields.flavor = null;
  }
  // subcategory hanya untuk goodiebag; kategori TYPE6 lain harus dikosongkan
  // supaya tidak menyisakan nilai dari kategori sebelumnya.
  if (!isGoodiebagCupcake(category)) {
    productFields.subcategory = null;
  }

  return productRepository.replaceProductVariants(id, productFields, variants || []);
};

// TYPE3 & TYPE4: produk dengan grid variant (Round & Square wajib lengkap)
const updateVariantGridType = async (id, payload) => {
  const { variants, removeVariants, ...rest } = payload;
  // kalau images dikirim, cover (image) ikut di-update dari images[0]
  const productFields = withDerivedCover(pickDefined(rest));

  return productRepository.updatePartialProductWithVariants(
    id,
    productFields,
    variants || [],
    removeVariants || []
  );
};

/**
 * Menghapus produk berdasarkan ID setelah memastikan produk tersebut ada.
 */
export const removeProduct = async (id) => {
  const existing = await productRepository.findProductById(id);

  if (!existing) {
    throw new AppError('Product tidak ditemukan', 404);
  }

  await productRepository.deleteProduct(id);
  invalidateProductCache();
};