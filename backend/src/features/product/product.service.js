import { AppError } from '../../utils/appError.js';
import * as productRepository from './product.repository.js';
import { updateProductSchemaMap } from './product.validation.js';

// helper: buang key yang value-nya undefined (field yang tidak dikirim admin)
const pickDefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/**
 * Membuat produk baru beserta variannya berdasarkan tipe produk.
 */
export const createProduct = async (payload) => {
  const { type, name, description, image, discount, flavor } = payload;

  let variantsData = [];

  // Jika TYPE1, varian diambil langsung dari root payload (single variant)
  if (type === 'TYPE1') {
    variantsData = [
      { shape: payload.shape, size: payload.size, price: payload.price },
    ];
  } else {
    // Jika tipe lain, varian berupa array yang di-mapping
    variantsData = payload.variants.map((v) => ({
      shape: v.shape,
      size: v.size,
      price: v.price,
    }));
  }

  // Simpan data produk dan varian ke repository
  const product = await productRepository.createProductWithVariants({
    type,
    name,
    description,
    image,
    flavor: type === 'TYPE3' ? null : flavor, // TYPE3 tidak memiliki flavor
    discount,
    variants: {
      create: variantsData,
    },
  });

  return product;
};

/**
 * Mengambil satu produk berdasarkan ID. Melempar error 404 jika tidak ada.
 */
export const getProductById = async (id) => {
  const product = await productRepository.findProductById(id);

  if (!product) {
    throw new AppError('Product tidak ditemukan', 404);
  }

  return product;
};

/**
 * Mengambil semua daftar produk yang tersedia.
 */
export const getAllProducts = async () => {
  return productRepository.findAllProducts();
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

  if (type === 'TYPE1') {
    return updateType1(id, existing, payload);
  }

  return updateType2Or3(id, payload);
};

const updateType1 = async (id, existing, payload) => {
  const { shape, size, price, ...rest } = payload;
  const productFields = pickDefined(rest);

  const existingVariant = existing.variants[0];

  // hanya bikin object update variant kalau ada salah satu dari shape/size/price dikirim
  let variantFields = null;
  if (shape !== undefined || size !== undefined || price !== undefined) {
    variantFields = {
      shape: shape ?? existingVariant.shape,
      size: size ?? existingVariant.size,
      price: price ?? existingVariant.price,
    };
  }

  return productRepository.updateType1ProductPartial(
    id,
    productFields,
    existingVariant.id,
    variantFields
  );
};

const updateType2Or3 = async (id, payload) => {
  const { variants, removeVariants, ...rest } = payload;
  const productFields = pickDefined(rest);

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
};