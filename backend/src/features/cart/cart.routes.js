// src/features/cart/cart.routes.js
import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.js";
import {
   addItemSchema,
   updateQuantitySchema,
   cartItemIdParamSchema,
} from "./cart.validation.js";
import * as cartController from "./cart.controller.js";

/**
 * Endpoint keranjang (prefix /api/cart).
 * Keranjang selalu milik user yang sedang login, jadi tidak ada :userId
 * di URL — id-nya diambil dari token.
 */
const router = Router();

router.use(authMiddleware); // semua endpoint cart wajib login

// Lihat isi keranjang
router.get("/", cartController.getCart);

// Tambah item. Body-nya paling kompleks karena menampung semua pilihan
// per tipe produk (rasa, filling, topping, dsb).
router.post(
   "/items",
   validate(addItemSchema, "body"),
   cartController.addItemToCart
);

// Ubah jumlah item (quantity 0 = item dihapus)
router.patch(
   "/items/:itemId",
   validate(cartItemIdParamSchema, "params"),
   validate(updateQuantitySchema, "body"),
   cartController.updateItemQuantity
);

// Hapus satu item
router.delete(
   "/items/:itemId",
   validate(cartItemIdParamSchema, "params"),
   cartController.removeItem
);

// Kosongkan seluruh keranjang
router.delete("/", cartController.clearCart);

export default router;
