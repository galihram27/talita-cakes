// src/features/cart/cart.controller.js
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import * as cartService from './cart.service.js';

export const addItemToCart = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const item = await cartService.addItemToCart(userId, req.body);

  res.status(201).json({
    success: true,
    message: 'Item berhasil ditambahkan ke keranjang',
    data: item,
  });
});

export const getCart = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const cart = await cartService.getCartByUserId(userId);

  res.status(200).json({
    success: true,
    message: 'Keranjang berhasil diambil',
    data: cart,
  });
});

export const updateItemQuantity = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { itemId } = req.params;
  const { quantity } = req.body;

  const item = await cartService.updateItemQuantity(userId, itemId, quantity);

  if (item === null) {
    return res.status(200).json({
      success: true,
      message: 'Item dihapus dari keranjang karena quantity 0',
      data: null,
    });
  }

  res.status(200).json({
    success: true,
    message: 'Quantity item berhasil diperbarui',
    data: item,
  });
});

export const removeItem = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { itemId } = req.params;

  await cartService.removeItem(userId, itemId);

  res.status(200).json({
    success: true,
    message: 'Item berhasil dihapus dari keranjang',
  });
});

export const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user.userId;

  await cartService.clearCart(userId);

  res.status(200).json({
    success: true,
    message: 'Keranjang berhasil dikosongkan',
  });
});