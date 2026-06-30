// src/features/order/order.controller.js
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import * as orderService from './order.service.js';

/**
 * Preview order summary (subtotal, ongkir, total) TANPA menyimpan apa pun.
 * Dipanggil tiap kali user mengisi/mengubah form checkout.
 */
export const previewCheckoutHandler = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const summary = await orderService.previewCheckout(userId, req.body);

  res.status(200).json({
    success: true,
    data: summary,
  });
});

/**
 * Confirm order: dipanggil tepat saat user klik "Kirim Pesanan ke WhatsApp".
 * Order baru dibuat, cart dikosongkan, di titik ini.
 */
export const confirmCheckoutHandler = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { order, whatsappLink } = await orderService.confirmCheckout(userId, req.body);

  res.status(201).json({
    success: true,
    message: 'Order berhasil dibuat',
    data: {
      order,
      whatsappLink,
    },
  });
});

/**
 * Histori order milik user yang login, dipakai di halaman profile.
 * Field `status` SENGAJA tidak diikutkan di response (keputusan UX:
 * keputusan akhir pesanan ada di chat WhatsApp, bukan status sistem).
 */
export const getOrderHistoryHandler = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const orders = await orderService.getOrderHistory(userId);

  const sanitized = orders.map(({ status, ...rest }) => rest);

  res.status(200).json({
    success: true,
    data: sanitized,
  });
});

/**
 * Detail 1 order milik user yang login. Sama seperti histori,
 * status tidak diikutkan di response untuk user biasa.
 */
export const getOrderByIdHandler = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { status, ...order } = await orderService.getOrderById(userId, req.params.id);

  res.status(200).json({
    success: true,
    data: order,
  });
});

/**
 * ===== ADMIN =====
 */

/**
 * Lihat semua order (lintas user), bisa difilter via query ?status=PENDING.
 * Status TETAP diikutkan di sini, karena ini khusus admin/owner.
 */
export const getAllOrdersForAdminHandler = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const orders = await orderService.getAllOrdersForAdmin(status);

  res.status(200).json({
    success: true,
    data: orders,
  });
});

/**
 * Update status order (tombol Konfirmasi/Batal/Selesai di halaman admin).
 */
export const updateOrderStatusHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const order = await orderService.updateOrderStatusByAdmin(id, status);

  res.status(200).json({
    success: true,
    message: 'Status order berhasil diperbarui',
    data: order,
  });
});