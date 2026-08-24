// src/features/order/order.service.js
import { AppError } from "../../utils/appError.js";
import * as orderRepository from "./order.repository.js";
import * as cartRepository from "../cart/cart.repository.js";
import { checkoutSchema, previewSchema } from "./order.validation.js";
import {
   calculateDeliveryFee,
   MAX_DELIVERY_DISTANCE_KM,
} from "./order.helper.js";
import { getDeliveryDistanceKm } from "../../utils/distance.js";
import {
   STORE_LOCATION,
   OWNER_WHATSAPP_NUMBER,
} from "../../config/store.config.js";
import {
   buildWhatsappMessage,
   buildWhatsappLink,
} from "../../utils/whatsapp.js";

/**
 * Aturan bisnis pesanan.
 *
 * Checkout di sini tidak berakhir di pembayaran online, tapi di WhatsApp:
 * order disimpan sebagai catatan, lalu user diarahkan ke chat penjual dengan
 * pesan yang sudah tersusun rapi.
 *
 * Alurnya dua tahap:
 * 1. preview  -> hitung subtotal, ongkir, dan total. Tidak menyimpan apa pun,
 *                jadi aman dipanggil berkali-kali sambil user mengisi form.
 * 2. confirm  -> baru menyimpan order, menyusun pesan WA, dan mengosongkan
 *                keranjang.
 *
 * Keduanya memakai perhitungan yang sama (buildOrderCalculation) supaya angka
 * yang dilihat user saat preview persis sama dengan yang tersimpan.
 *
 * Ongkir selalu dihitung ulang di server dari koordinat alamat — angka dari
 * client tidak pernah dipercaya.
 */

/**
 * Helper bersama: validasi payload + ambil cart + hitung subtotal/ongkir.
 * Dipakai oleh preview & confirm, supaya logic hitungnya tidak duplikat.
 * TIDAK menyentuh database (selain read cart) — murni kalkulasi.
 *
 * Validasinya dijalankan manual di sini (bukan lewat middleware validate)
 * karena preview & confirm memakai skema berbeda: saat preview sebagian
 * data penerima memang belum diisi user.
 */
const buildOrderCalculation = async (
   userId,
   payload,
   schema = checkoutSchema
) => {
   const parsed = schema.safeParse(payload);
   if (!parsed.success) {
      throw new AppError("Validasi gagal", 422, parsed.error.flatten());
   }
   const data = parsed.data;

   const cart = await cartRepository.findCartWithItemsByUserId(userId);
   if (!cart || cart.items.length === 0) {
      throw new AppError("Keranjang kosong, tidak bisa checkout", 422);
   }

   // Salin isi keranjang jadi "foto" saat pemesanan: nama & harga produk ikut
   // disimpan, supaya riwayat pesanan tidak ikut berubah kalau nanti admin
   // mengganti harga atau nama produknya.
   const orderItemsData = cart.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      flavor: item.flavor,
      filling: item.filling,
      topping: item.topping,
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

   if (data.fulfillmentType === "DELIVERY") {
      distanceKm = await getDeliveryDistanceKm(
         STORE_LOCATION.lat,
         STORE_LOCATION.lng,
         data.addressLat,
         data.addressLng
      );
      deliveryFee = calculateDeliveryFee(distanceKm);

      // null = di luar radius layanan pengiriman
      if (deliveryFee === null) {
         throw new AppError(
            `Alamat di luar radius pengiriman ${MAX_DELIVERY_DISTANCE_KM} km. Silakan hubungi kami untuk informasi biaya pengiriman.`,
            422
         );
      }
   }

   const total = subtotal + deliveryFee;

   return {
      data,
      cart,
      orderItemsData,
      subtotal,
      distanceKm,
      deliveryFee,
      total,
   };
};

/**
 * PREVIEW: hitung ringkasan order summary (subtotal, ongkir, total)
 * TANPA menyimpan apa pun ke database. Dipakai untuk tampilan
 * "Order Summary" sebelum user klik tombol kirim ke WhatsApp.
 */
export const previewCheckout = async (userId, payload) => {
   const { orderItemsData, subtotal, distanceKm, deliveryFee, total } =
      await buildOrderCalculation(userId, payload, previewSchema);

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
   const {
      data,
      cart,
      orderItemsData,
      subtotal,
      distanceKm,
      deliveryFee,
      total,
   } = await buildOrderCalculation(userId, payload);

   const isDelivery = data.fulfillmentType === "DELIVERY";
   const isForSomeoneElse = data.recipientType === "FOR_SOMEONE_ELSE";

   // Field yang tidak relevan sengaja disimpan null, bukan dibiarkan terbawa
   // dari body. Contoh: kalau ambil sendiri (PICKUP), data alamat & penerima
   // tidak ikut tersimpan walaupun client mengirimnya.
   const order = await orderRepository.createOrderWithItems({
      userId,
      fulfillmentType: data.fulfillmentType,
      requestCakeDate: data.requestCakeDate,
      recipientType: isDelivery ? data.recipientType : null,
      recipientName: isForSomeoneElse ? data.recipientName : null,
      recipientPhone: isForSomeoneElse ? data.recipientPhone : null,
      recipientDataConsent: isForSomeoneElse
         ? data.recipientDataConsent
         : false,
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

   // Pesan WA baru bisa disusun setelah order tersimpan, karena butuh order.id
   // sebagai nomor referensi. Hasilnya ikut disimpan untuk arsip.
   const whatsappMessage = buildWhatsappMessage(order, {
      includeEmail: data.includeEmail === true,
   });
   await orderRepository.updateWhatsappMessage(order.id, whatsappMessage);

   // cart baru dihapus di titik ini, bukan saat preview
   await cartRepository.deleteAllCartItems(cart.id);

   const whatsappLink = buildWhatsappLink(
      OWNER_WHATSAPP_NUMBER,
      whatsappMessage
   );

   return { order, whatsappLink };
};

// =========================
// RIWAYAT PESANAN (customer)
// =========================

// Semua pesanan milik user yang sedang login, terbaru di atas.
export const getOrderHistory = async (userId) => {
   return orderRepository.findOrdersByUserId(userId);
};

/**
 * Detail satu pesanan. Pesanan milik user lain dibalas 404 (bukan 403) supaya
 * id pesanan orang lain tidak bisa ditebak keberadaannya.
 */
export const getOrderById = async (userId, orderId) => {
   const order = await orderRepository.findOrderById(orderId);

   if (!order || order.userId !== userId) {
      throw new AppError("Order tidak ditemukan", 404);
   }

   return order;
};

// =========================
// ADMIN
// =========================

// Semua pesanan lintas user, opsional difilter per status.
export const getAllOrdersForAdmin = async (status) => {
   const orders = await orderRepository.findAllOrders(status);

   // Jangan bocorkan field sensitif user (password hash, dll) ke response —
   // admin cukup tahu identitas & kontak pemesan
   return orders.map((order) => ({
      ...order,
      user: order.user
         ? {
              id: order.user.id,
              name: order.user.name,
              email: order.user.email,
              phone: order.user.phone,
           }
         : null,
   }));
};

// Ubah status pesanan (tombol Konfirmasi/Batal/Selesai di halaman admin).
// Keberadaan order dicek dulu supaya error-nya 404 yang jelas, bukan error
// mentah dari Prisma.
export const updateOrderStatusByAdmin = async (orderId, status) => {
   const order = await orderRepository.findOrderById(orderId);

   if (!order) {
      throw new AppError("Order tidak ditemukan", 404);
   }

   return orderRepository.updateOrderStatus(orderId, status);
};
