import prisma from "../../lib/prisma.js";
import { AppError } from '../../utils/appError.js';
import { hasRoundAndSquare, validateAllVariantsCompleteness } from './product.helper.js';

/**
 * Membuat produk baru sekaligus menyertakan variannya.
 */
export const createProductWithVariants = async (data) => {
  return await prisma.product.create({
    data,
    include: { variants: true },
  });
};

/**
 * Mencari satu produk berdasarkan ID beserta variannya.
 */
export const findProductById = async (id) => {
  return await prisma.product.findUnique({
    where: { id },
    include: { variants: true },
  });
};

/**
 * Mencari produk berdasarkan keyword pada nama, deskripsi, atau flavor.
 */
export const searchProductsByKeyword = async (keyword) => {
  return await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { flavor: { contains: keyword, mode: 'insensitive' } },
      ],
    },
    include: { variants: true },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Mengambil semua produk beserta variannya, diurutkan dari yang terbaru.
 */
export const findAllProducts = async () => {
  return await prisma.product.findMany({
    include: { variants: true },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Update TYPE1: update field product (yang dikirim saja) + update 1 variant
 * dengan field yang dikirim saja (merge dengan data lama).
 */
export const updateType1ProductPartial = async (id, productFields, variantId, variantFields) => {
  return prisma.$transaction(async (tx) => {
    if (Object.keys(productFields).length > 0) {
      await tx.product.update({ where: { id }, data: productFields });
    }

    if (variantFields) {
      await tx.productVariant.update({
        where: { id: variantId },
        data: variantFields,
      });
    }

    return tx.product.findUnique({ where: { id }, include: { variants: true } });
  });
};

/**
 * Update TYPE2/TYPE3: update field product (yang dikirim saja) +
 * upsert variant yang dikirim (tambah/ubah harga) +
 * hapus variant yang diminta dihapus (misal saat ganti min size) +
 * validasi ulang hasil akhirnya. Kalau tidak valid, transaksi rollback.
 */
export const updatePartialProductWithVariants = async (id, productFields, variantsToUpsert = [], variantsToRemove = []) => {
  return prisma.$transaction(async (tx) => {
    if (Object.keys(productFields).length > 0) {
      await tx.product.update({ where: { id }, data: productFields });
    }

    for (const v of variantsToUpsert) {
      await tx.productVariant.upsert({
        where: {
          productId_shape_size: { productId: id, shape: v.shape, size: v.size },
        },
        update: { price: v.price },
        create: { productId: id, shape: v.shape, size: v.size, price: v.price },
      });
    }

    for (const r of variantsToRemove) {
      await tx.productVariant.deleteMany({
        where: { productId: id, shape: r.shape, size: r.size },
      });
    }

    const result = await tx.product.findUnique({ where: { id }, include: { variants: true } });

    if (!hasRoundAndSquare(result.variants)) {
      throw new AppError('Variants harus tetap memiliki minimal satu Round dan satu Square', 422);
    }

    const completeness = validateAllVariantsCompleteness(result.variants);
    if (!completeness.valid) {
      throw new AppError(completeness.message, 422);
    }

    return result;
  });
};

/**
 * Menghapus semua varian yang dimiliki oleh satu produk tertentu.
 */
export const deleteProductVariants = async (productId) => {
  return await prisma.productVariant.deleteMany({
    where: { productId },
  });
};

/**
 * Menghapus produk berdasarkan ID.
 */
export const deleteProduct = async (id) => {
  return await prisma.product.delete({
    where: { id },
  });
};
