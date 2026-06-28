// src/features/cart/cart.service.js
import { AppError } from '../../utils/appError.js';
import * as cartRepository from './cart.repository.js';
import * as productRepository from '../../features/product/product.repository.js';

const PRODUCT_TYPE = {
  TYPE1: 'TYPE1',
  TYPE2: 'TYPE2',
  TYPE3: 'TYPE3',
};

/**
 * Hitung harga final per-unit setelah discount.
 * discount disimpan dalam Decimal(5,2) -> diasumsikan dalam PERSEN (0-100).
 * Kalau ternyata discount dimaksud nominal rupiah, ubah logic ini.
 */
const applyDiscount = (basePrice, discountPercent) => {
  const price = Number(basePrice);
  const discount = Number(discountPercent ?? 0);
  const finalPrice = price - (price * discount) / 100;
  return Math.round(finalPrice * 100) / 100; // 2 desimal
};

/**
 * Validasi & resolve variant + price berdasarkan ProductType.
 * Mengembalikan { variantId, flavor, price } yang sudah final,
 * supaya controller/repository tidak perlu tahu logic bisnis ini.
 */
const resolveItemDetails = async (product, payload) => {
  const { type, discount } = product;

  // TYPE 1
  if (type === PRODUCT_TYPE.TYPE1) {
    const variant = await productRepository.findSingleVariantByProductId(product.id);
    if (!variant) {
      throw new AppError('Variant untuk produk ini belum tersedia', 422);
    }

    return {
      variantId: null, // tidak disimpan di cart item, sesuai desain
      flavor: null,
      customImage: null,
      price: applyDiscount(variant.price, discount),
    };
  }

  // TYPE 2
  if (type === PRODUCT_TYPE.TYPE2 || type === PRODUCT_TYPE.TYPE3) {
    if (!payload.variantId) {
      throw new AppError('variantId wajib diisi untuk tipe produk ini', 422);
    }

    const variant = await productRepository.findVariantById(payload.variantId);
    if (!variant || variant.productId !== product.id) {
      throw new AppError('Variant tidak ditemukan untuk produk ini', 404);
    }

    // TYPE 3
    if (type === PRODUCT_TYPE.TYPE3) {
      if (!payload.flavor) {
        throw new AppError('flavor wajib diisi untuk tipe produk ini', 422);
      }
    }

    return {
      variantId: variant.id,
      flavor: type === PRODUCT_TYPE.TYPE3 ? payload.flavor : null,
      customImage: type === PRODUCT_TYPE.TYPE3 ? payload.customImage : null,
      price: applyDiscount(variant.price, discount),
    };
  }

  throw new AppError('Tipe produk tidak dikenali', 422);
};

/**
 * Tambah item ke cart. Kalau item identik (productId + variantId + flavor)
 * sudah ada, quantity di-increment, bukan bikin baris baru.
 */
export const addItemToCart = async (userId, payload) => {
  const { productId, quantity, textOnCake, notes } = payload;

  if (!quantity || quantity < 1) {
    throw new AppError('quantity minimal 1', 422);
  }

  const product = await productRepository.findProductById(productId);
  if (!product) {
    throw new AppError('Produk tidak ditemukan', 404);
  }

  const { variantId, flavor, customImage, price } = await resolveItemDetails(product, payload);

  const cart = await cartRepository.findOrCreateCart(userId);

  const existingItem = await cartRepository.findMatchingCartItem({
    cartId: cart.id,
    productId,
    variantId,
    flavor,
  });

  if (existingItem) {
    return cartRepository.incrementCartItemQuantity(existingItem.id, quantity);
  }

  return cartRepository.createCartItem({
    cartId: cart.id,
    productId,
    variantId,
    flavor,
    customImage,
    textOnCake,
    notes,
    quantity,
    price,
  });
};

/**
 * Ambil isi cart user + hitung quantity x price per item, dan subtotal total.
 * Kalau user belum punya cart sama sekali, kembalikan struktur kosong
 * (tidak perlu create cart kosong di DB hanya untuk "lihat" cart).
 */
export const getCartByUserId = async (userId) => {
  const cart = await cartRepository.findCartWithItemsByUserId(userId);

  if (!cart) {
    return { id: null, items: [], subtotal: 0 };
  }

  let subtotal = 0;

  const items = cart.items.map((item) => {
    const lineTotal = Number(item.price) * item.quantity;
    subtotal += lineTotal;

    return {
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productImage: item.product.image,
      variantId: item.variantId,
      shape: item.variant?.shape ?? null,
      size: item.variant?.size ?? null,
      flavor: item.flavor,
      customImage: item.customImage,
      textOnCake: item.textOnCake,
      notes: item.notes,
      quantity: item.quantity,
      price: Number(item.price),
      lineTotal,
    };
  });

  return {
    id: cart.id,
    items,
    subtotal,
  };
};

export const updateItemQuantity = async (userId, itemId, quantity) => {
  const item = await cartRepository.findCartItemById(itemId);
  if (!item || item.cart.userId !== userId) {
    throw new AppError('Item keranjang tidak ditemukan', 404);
  }

  if (quantity === 0) {
    await cartRepository.deleteCartItem(itemId);
    return null; // item sudah dihapus, tidak ada data untuk dikembalikan
  }

  return cartRepository.updateCartItemQuantity(itemId, quantity);
};

export const removeItem = async (userId, itemId) => {
  const item = await cartRepository.findCartItemById(itemId);
  if (!item || item.cart.userId !== userId) {
    throw new AppError('Item keranjang tidak ditemukan', 404);
  }

  return cartRepository.deleteCartItem(itemId);
};

export const clearCart = async (userId) => {
  const cart = await cartRepository.findCartByUserId(userId);
  if (!cart) return;

  return cartRepository.deleteAllCartItems(cart.id);
};