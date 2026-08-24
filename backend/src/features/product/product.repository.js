import prisma from "../../lib/prisma.js";
import { AppError } from "../../utils/appError.js";
import {
   hasRoundAndSquare,
   validateAllVariantsCompleteness,
} from "./product.helper.js";

/**
 * Query tabel produk & variannya.
 *
 * Semua update varian dibungkus transaksi, karena satu perubahan biasanya
 * menyentuh beberapa baris sekaligus — kalau gagal di tengah, semuanya
 * dibatalkan agar tidak ada produk yang variannya separuh jadi.
 *
 * Ini juga satu-satunya lapisan repository yang ikut memvalidasi (kelengkapan
 * ukuran TYPE3/TYPE4), karena pengecekannya baru bisa dilakukan setelah semua
 * perubahan diterapkan, di dalam transaksi yang sama, supaya bisa di-rollback.
 */

// Default 5s kekecilan: DB remote punya latency tinggi dan satu transaksi bisa
// berisi banyak round-trip (varian di-upsert satu per satu).
const TX_OPTIONS = { maxWait: 15000, timeout: 30000 };

// =========================
// CREATE
// =========================

/**
 * Membuat produk baru sekaligus menyertakan variannya.
 * Varian ikut dibuat lewat nested create, jadi otomatis satu transaksi.
 */
export const createProductWithVariants = async (data) => {
   return await prisma.product.create({
      data,
      include: { variants: true },
   });
};

// =========================
// READ
// =========================

/**
 * Menghitung jumlah produk (opsional difilter category).
 * Dipakai dashboard analytics supaya tidak perlu menarik seluruh katalog
 * hanya untuk mengambil angka totalnya.
 */
export const countProducts = async (category) => {
   return await prisma.product.count({
      where: category ? { category } : undefined,
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
   // shape adalah enum, jadi keyword dicocokkan dulu ke nilai enum-nya.
   // Hanya berlaku untuk TYPE1/TYPE2 (shape ditentukan admin); TYPE3/TYPE4
   // selalu punya Round & Square sehingga tidak relevan untuk pencarian shape.
   const matchedShapes = ["ROUND", "SQUARE"].filter((s) =>
      s.toLowerCase().includes(keyword.toLowerCase())
   );

   const orConditions = [
      { name: { contains: keyword, mode: "insensitive" } },
      { description: { contains: keyword, mode: "insensitive" } },
      { descriptionEn: { contains: keyword, mode: "insensitive" } },
      { flavor: { contains: keyword, mode: "insensitive" } },
      { category: { contains: keyword, mode: "insensitive" } },
      { subcategory: { contains: keyword, mode: "insensitive" } },
   ];

   if (matchedShapes.length > 0) {
      orConditions.push({
         type: { in: ["TYPE1", "TYPE2"] },
         variants: { some: { shape: { in: matchedShapes } } },
      });
   }

   return await prisma.product.findMany({
      where: { OR: orConditions },
      include: { variants: true },
      orderBy: { createdAt: "desc" },
   });
};

/**
 * Mengambil semua produk beserta variannya, diurutkan dari yang terbaru.
 * Kalau category diisi, hanya produk dengan category tsb yang diambil.
 */
export const findAllProducts = async (category) => {
   return await prisma.product.findMany({
      where: category ? { category } : undefined,
      include: { variants: true },
      orderBy: { createdAt: "desc" },
   });
};

// Ambil satu-satunya varian milik produk bervarian tunggal (TYPE1/TYPE2/TYPE5).
// Dipakai keranjang, karena untuk tipe ini user tidak memilih varian.
export const findSingleVariantByProductId = async (productId) => {
   return prisma.productVariant.findFirst({
      where: { productId },
   });
};

// Ambil varian tertentu + produk induknya, dipakai keranjang untuk memastikan
// varian yang dipilih memang milik produk yang bersangkutan.
export const findVariantById = async (id) => {
   return prisma.productVariant.findUnique({
      where: { id },
      include: { product: true },
   });
};

// =========================
// UPDATE
// =========================

/**
 * Produk bervarian tunggal (TYPE1, TYPE2, TYPE5 biasa): update field produk
 * dan field varian yang dikirim saja, digabung dengan data lama.
 * Varian tidak dihapus-buat ulang, jadi variantId-nya tetap.
 */
export const updateType1ProductPartial = async (
   id,
   productFields,
   variantId,
   variantFields
) => {
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

      return tx.product.findUnique({
         where: { id },
         include: { variants: true },
      });
   }, TX_OPTIONS);
};

/**
 * Produk bervarian grid (TYPE3 & TYPE4): update field produk yang dikirim +
 * upsert varian yang dikirim (tambah/ubah harga) + hapus varian yang diminta
 * dihapus (misal saat admin mengganti ukuran minimum).
 *
 * Hasil akhirnya divalidasi ulang DI DALAM transaksi: harus tetap punya Round
 * dan Square, dan rentang ukurannya harus lengkap. Kalau tidak, error yang
 * dilempar membatalkan seluruh perubahan.
 */
export const updatePartialProductWithVariants = async (
   id,
   productFields,
   variantsToUpsert = [],
   variantsToRemove = []
) => {
   return prisma.$transaction(async (tx) => {
      if (Object.keys(productFields).length > 0) {
         await tx.product.update({ where: { id }, data: productFields });
      }

      for (const v of variantsToUpsert) {
         await tx.productVariant.upsert({
            where: {
               productId_shape_size: {
                  productId: id,
                  shape: v.shape,
                  size: v.size,
               },
            },
            // image ikut di-update supaya admin bisa mengganti foto per bentuk
            // tanpa harus menghapus & membuat ulang seluruh varian
            update: { price: v.price, image: v.image ?? null },
            create: {
               productId: id,
               shape: v.shape,
               size: v.size,
               price: v.price,
               image: v.image ?? null,
            },
         });
      }

      for (const r of variantsToRemove) {
         await tx.productVariant.deleteMany({
            where: { productId: id, shape: r.shape, size: r.size },
         });
      }

      const result = await tx.product.findUnique({
         where: { id },
         include: { variants: true },
      });

      if (!hasRoundAndSquare(result.variants)) {
         throw new AppError(
            "Variants harus tetap memiliki minimal satu Round dan satu Square",
            422
         );
      }

      const completeness = validateAllVariantsCompleteness(result.variants);
      if (!completeness.valid) {
         throw new AppError(completeness.message, 422);
      }

      return result;
   }, TX_OPTIONS);
};

/**
 * Ganti SELURUH varian sekaligus. Dipakai TYPE6 (isi box), bread (ukuran
 * bernama), dan TYPE5 size-pilihan.
 *
 * Sengaja hapus-lalu-buat, bukan upsert seperti TYPE3/TYPE4: varian cupcake
 * punya shape NULL, sedangkan unique gabungan (productId, shape, size) tidak
 * bisa mencocokkan baris ber-NULL di Postgres — upsert akan gagal mendeteksi
 * baris lama dan justru membuat duplikat.
 */
export const replaceProductVariants = async (id, productFields, variants) => {
   return prisma.$transaction(async (tx) => {
      if (Object.keys(productFields).length > 0) {
         await tx.product.update({ where: { id }, data: productFields });
      }

      if (variants.length > 0) {
         await tx.productVariant.deleteMany({ where: { productId: id } });
         await tx.productVariant.createMany({
            data: variants.map((v) => ({
               productId: id,
               // TYPE6 (box) tidak mengirim shape -> null; TYPE5 size-pilihan kirim ROUND
               shape: v.shape ?? null,
               size: v.size ?? null,
               sizeB: v.sizeB ?? null,
               price: v.price,
               image: v.image ?? null,
            })),
         });
      }

      return tx.product.findUnique({
         where: { id },
         include: { variants: true },
      });
   }, TX_OPTIONS);
};

// =========================
// DELETE
// =========================

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
