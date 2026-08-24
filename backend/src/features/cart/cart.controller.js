// src/features/cart/cart.controller.js
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import * as cartService from "./cart.service.js";

/**
 * Controller keranjang.
 *
 * Semua endpoint wajib login, dan userId selalu diambil dari token
 * (`req.user.userId`) — tidak pernah dari body — supaya user tidak bisa
 * mengutak-atik keranjang orang lain.
 */

// POST /cart/items — tambah item
export const addItemToCart = asyncHandler(async (req, res) => {
   const userId = req.user.userId;
   const item = await cartService.addItemToCart(userId, req.body);

   res.status(201).json({
      success: true,
      message: "Item berhasil ditambahkan ke keranjang",
      data: item,
   });
});

// GET /cart — isi keranjang + subtotal yang sudah dihitung service
export const getCart = asyncHandler(async (req, res) => {
   const userId = req.user.userId;
   const cart = await cartService.getCartByUserId(userId);

   res.status(200).json({
      success: true,
      message: "Keranjang berhasil diambil",
      data: cart,
   });
});

// PATCH /cart/items/:itemId — ubah jumlah.
// Service mengembalikan null kalau quantity 0 (item dihapus), jadi pesannya
// dibedakan supaya frontend bisa menampilkan notifikasi yang sesuai.
export const updateItemQuantity = asyncHandler(async (req, res) => {
   const userId = req.user.userId;
   const { itemId } = req.params;
   const { quantity } = req.body;

   const item = await cartService.updateItemQuantity(userId, itemId, quantity);

   if (item === null) {
      return res.status(200).json({
         success: true,
         message: "Item dihapus dari keranjang karena quantity 0",
         data: null,
      });
   }

   res.status(200).json({
      success: true,
      message: "Quantity item berhasil diperbarui",
      data: item,
   });
});

// DELETE /cart/items/:itemId — hapus satu item
export const removeItem = asyncHandler(async (req, res) => {
   const userId = req.user.userId;
   const { itemId } = req.params;

   await cartService.removeItem(userId, itemId);

   res.status(200).json({
      success: true,
      message: "Item berhasil dihapus dari keranjang",
   });
});

// DELETE /cart — kosongkan seluruh keranjang
export const clearCart = asyncHandler(async (req, res) => {
   const userId = req.user.userId;

   await cartService.clearCart(userId);

   res.status(200).json({
      success: true,
      message: "Keranjang berhasil dikosongkan",
   });
});
