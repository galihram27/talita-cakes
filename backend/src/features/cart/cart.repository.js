// src/features/cart/cart.repository.js
import prisma from "../../lib/prisma.js";

/**
 * Cari cart milik user. Karena 1 user hanya punya 1 cart (userId @unique),
 * tidak perlu filter status seperti "active" dsb.
 */
export const findCartByUserId = async (userId) => {
  return prisma.cart.findUnique({
    where: { userId },
  });
};

/**
 * Ambil cart beserta seluruh item-nya, lengkap dengan relasi product & variant
 * supaya service layer bisa hitung price x quantity & subtotal tanpa query tambahan.
 */
export const findCartWithItemsByUserId = async (userId) => {
  return prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
};

export const createCart = async (userId) => {
  return prisma.cart.create({
    data: { userId },
  });
};

/**
 * Dipakai service layer: kalau user belum punya cart, buatkan otomatis.
 * Pattern "find or create" tanpa race condition parah karena userId unique
 * (kalau terjadi race, salah satu create akan gagal kena unique constraint,
 * dan service bisa retry findCartByUserId).
 */
export const findOrCreateCart = async (userId) => {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
};

/**
 * Cari item yang "sama" di dalam cart, untuk keperluan merge quantity
 * kalau user nambahin produk yang identik (productId + variantId + flavor sama).
 * textOnCake & notes TIDAK dijadikan kunci dedup, karena dianggap sebagai
 * custom request per baris, bukan pembeda varian produk.
 *
 * Catatan: kalau bisnisnya ingin textOnCake/notes berbeda = item terpisah,
 * tinggal tambahkan ke kondisi where di bawah.
 */
export const findMatchingCartItem = async ({ cartId, productId, variantId, flavor }) => {
  return prisma.cartItem.findFirst({
    where: {
      cartId,
      productId,
      variantId: variantId ?? null,
      flavor: flavor ?? null,
    },
  });
};

export const findCartItemById = async (id) => {
  return prisma.cartItem.findUnique({
    where: { id },
    include: {
      product: true,
      variant: true,
      cart: true,
    },
  });
};

export const createCartItem = async (data) => {
  return prisma.cartItem.create({
    data: {
      cartId: data.cartId,
      productId: data.productId,
      variantId: data.variantId ?? null,
      flavor: data.flavor ?? null,
      customImage: data.customImage ?? null,
      textOnCake: data.textOnCake ?? null,
      notes: data.notes ?? null,
      quantity: data.quantity,
      price: data.price,
    },
  });
};

export const updateCartItemQuantity = async (id, quantity) => {
  return prisma.cartItem.update({
    where: { id },
    data: { quantity },
  });
};

/**
 * Increment quantity untuk kasus merge item yang sama (lihat findMatchingCartItem).
 * Pakai operator increment Prisma agar atomic, hindari race condition
 * dibanding read-then-write manual.
 */
export const incrementCartItemQuantity = async (id, incrementBy) => {
  return prisma.cartItem.update({
    where: { id },
    data: {
      quantity: { increment: incrementBy },
    },
  });
};

export const updateCartItem = async (id, data) => {
  return prisma.cartItem.update({
    where: { id },
    data,
  });
};

export const deleteCartItem = async (id) => {
  return prisma.cartItem.delete({
    where: { id },
  });
};

export const deleteAllCartItems = async (cartId) => {
  return prisma.cartItem.deleteMany({
    where: { cartId },
  });
};

export const countCartItems = async (cartId) => {
  return prisma.cartItem.count({
    where: { cartId },
  });
};