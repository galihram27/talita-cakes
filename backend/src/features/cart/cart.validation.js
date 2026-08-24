// src/features/cart/cart.validation.js
import { z } from "zod";
import { ALL_FLAVORS } from "../product/product.constant.js";

/**
 * Validasi body endpoint keranjang.
 *
 * Hampir semua field di sini opsional, karena satu skema ini melayani semua
 * tipe produk yang pilihannya berbeda-beda. Field mana yang WAJIB untuk tipe
 * tertentu baru ditentukan di cart.service.js, setelah produknya diambil dari DB.
 */

const baseAddItemSchema = z.object({
   productId: z.string().uuid({ message: "productId tidak valid" }),
   variantId: z.string().uuid({ message: "variantId tidak valid" }).optional(),
   flavor: z
      .enum(ALL_FLAVORS, {
         message: `flavor harus salah satu dari: ${ALL_FLAVORS.join(", ")}`,
      })
      .optional(),
   // rasa jamak (mis. goodiebag: 1-4 rasa). Isi & jumlahnya divalidasi di service.
   flavors: z.array(z.enum(ALL_FLAVORS)).optional(),
   // pilihan filling (satu) & topping (bisa beberapa) — CINROLLS VAN DEPOK.
   // Nama bebas (ditentukan admin per produk), divalidasi terhadap config produk
   // di service layer, bukan enum di sini.
   filling: z.string().optional(),
   toppings: z.array(z.string()).optional(),
   customImage: z.string().min(1).optional(),
   textOnCake: z.string().optional(),
   notes: z.string().optional(),
   quantity: z.coerce
      .number()
      .int()
      .positive({ message: "quantity minimal 1" }),
});

/**
 * Validasi ini hanya cek BENTUK payload secara umum.
 * Validasi "wajib per tipe produk" (mis. TYPE2 & TYPE4 wajib flavor)
 * tetap dilakukan di service layer, karena butuh data Product.type dari DB
 * yang baru diketahui setelah query, bukan dari body request semata.
 */
export const addItemSchema = baseAddItemSchema;

// PATCH /cart/items/:itemId — 0 diperbolehkan karena artinya "hapus item"
export const updateQuantitySchema = z.object({
   quantity: z.coerce
      .number()
      .int()
      .min(0, { message: "quantity tidak boleh negatif" }),
});

// :itemId di URL harus UUID, biar query tidak dijalankan untuk id ngawur
export const cartItemIdParamSchema = z.object({
   itemId: z.string().uuid({ message: "itemId tidak valid" }),
});
