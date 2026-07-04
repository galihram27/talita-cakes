// src/features/cart/cart.validation.js
import { z } from 'zod';
import { CUSTOM_FLAVORS } from '../product/product.constant.js';

const baseAddItemSchema = z.object({
  productId: z.string().uuid({ message: 'productId tidak valid' }),
  variantId: z.string().uuid({ message: 'variantId tidak valid' }).optional(),
   flavor: z.enum(CUSTOM_FLAVORS, { message: `flavor harus salah satu dari: ${CUSTOM_FLAVORS.join(', ')}` }).optional(),
  customImage: z.string().min(1).optional(),
  textOnCake: z.string().optional(),
  notes: z.string().optional(),
  quantity: z.coerce.number().int().positive({ message: 'quantity minimal 1' }),
});

/**
 * Validasi ini hanya cek BENTUK payload secara umum.
 * Validasi "wajib per tipe produk" (mis. TYPE2 & TYPE4 wajib flavor)
 * tetap dilakukan di service layer, karena butuh data Product.type dari DB
 * yang baru diketahui setelah query, bukan dari body request semata.
 */
export const addItemSchema = baseAddItemSchema;

export const updateQuantitySchema = z.object({
  quantity: z.coerce.number().int().min(0, { message: 'quantity tidak boleh negatif' }),
});

export const cartItemIdParamSchema = z.object({
  itemId: z.string().uuid({ message: 'itemId tidak valid' }),
});