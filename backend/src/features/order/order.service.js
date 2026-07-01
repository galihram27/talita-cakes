// src/features/order/order.service.js
import { AppError } from '../../utils/appError.js';
import * as orderRepository from './order.repository.js';
import * as cartRepository from '../cart/cart.repository.js';
import { checkoutSchema } from './order.validation.js';
import { calculateDeliveryFee } from './order.helper.js';
import { calculateDistanceKm } from '../../utils/distance.js';
import { STORE_LOCATION, OWNER_WHATSAPP_NUMBER } from '../../config/store.config.js';
import { buildWhatsappMessage, buildWhatsappLink } from '../../utils/whatsapp.js';

/**
 * Helper bersama: validasi payload + ambil cart + hitung subtotal/ongkir.
 * Dipakai oleh preview & confirm, supaya logic hitungnya tidak duplikat.
 * TIDAK menyentuh database (selain read cart) — murni kalkulasi.
 */
const buildOrderCalculation = async (userId, payload) => {
  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AppError('Validasi gagal', 422, parsed.error.flatten());
  }
  const data = parsed.data;

  const cart = await cartRepository.findCartWithItemsByUserId(userId);
  if (!cart || cart.items.length === 0) {
    throw new AppError('Keranjang kosong, tidak bisa checkout', 422);
  }

  const orderItemsData = cart.items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    flavor: item.flavor,
    customImage: item.customImage,
    textOnCake: item.textOnCake,
    notes: item.notes,
    quantity: item.quantity,
    productName: item.product.name,
    price: item.price,
  }));

  const subtotal = orderItemsData.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  let distanceKm = null;
  let deliveryFee = 0;

  if (data.fulfillmentType === 'DELIVERY') {
    distanceKm = calculateDistanceKm(
      STORE_LOCATION.lat,
      STORE_LOCATION.lng,
      data.addressLat,
      data.addressLng
    );
    deliveryFee = calculateDeliveryFee(distanceKm);
  }

  const total = subtotal + deliveryFee;

  return { data, cart, orderItemsData, subtotal, distanceKm, deliveryFee, total };
};

/**
 * PREVIEW: hitung ringkasan order summary (subtotal, ongkir, total)
 * TANPA menyimpan apa pun ke database. Dipakai untuk tampilan
 * "Order Summary" sebelum user klik tombol kirim ke WhatsApp.
 */
export const previewCheckout = async (userId, payload) => {
  const { orderItemsData, subtotal, distanceKm, deliveryFee, total } =
    await buildOrderCalculation(userId, payload);

  return {
    items: orderItemsData,
    subtotal,
    distanceKm,
    deliveryFee,
    total,
  };
};

/**
 * CONFIRM: dipanggil tepat saat user klik "Kirim Pesanan ke WhatsApp".
 * Di titik inilah order benar-benar dibuat, history tercatat,
 * dan cart dikosongkan.
 */
export const confirmCheckout = async (userId, payload) => {
  const { data, cart, orderItemsData, subtotal, distanceKm, deliveryFee, total } =
    await buildOrderCalculation(userId, payload);

  const isDelivery = data.fulfillmentType === 'DELIVERY';
  const isForSomeoneElse = data.recipientType === 'FOR_SOMEONE_ELSE';

  const order = await orderRepository.createOrderWithItems({
    userId,
    fulfillmentType: data.fulfillmentType,
    requestCakeDate: data.requestCakeDate,
    recipientType: isDelivery ? data.recipientType : null,
    recipientName: isForSomeoneElse ? data.recipientName : null,
    recipientPhone: isForSomeoneElse ? data.recipientPhone : null,
    recipientDataConsent: isForSomeoneElse ? data.recipientDataConsent : false,
    address: isDelivery ? data.address : null,
    addressLat: isDelivery ? data.addressLat : null,
    addressLng: isDelivery ? data.addressLng : null,
    distanceKm,
    subtotal,
    deliveryFee,
    total,
    items: {
      create: orderItemsData,
    },
  });

  const whatsappMessage = buildWhatsappMessage(order);
  await orderRepository.updateWhatsappMessage(order.id, whatsappMessage);

  // cart baru dihapus di titik ini, bukan saat preview
  await cartRepository.deleteAllCartItems(cart.id);

  const whatsappLink = buildWhatsappLink(OWNER_WHATSAPP_NUMBER, whatsappMessage);

  return { order, whatsappLink };
};

export const getOrderHistory = async (userId) => {
  return orderRepository.findOrdersByUserId(userId);
};

export const getOrderById = async (userId, orderId) => {
  const order = await orderRepository.findOrderById(orderId);

  if (!order || order.userId !== userId) {
    throw new AppError('Order tidak ditemukan', 404);
  }

  return order;
};

export const getAllOrdersForAdmin = async (status) => {
  return orderRepository.findAllOrders(status);
};

export const updateOrderStatusByAdmin = async (orderId, status) => {
  const order = await orderRepository.findOrderById(orderId);

  if (!order) {
    throw new AppError('Order tidak ditemukan', 404);
  }

  return orderRepository.updateOrderStatus(orderId, status);
};