// src/features/order/order.repository.js
import prisma from "../../lib/prisma.js";

/**
 * Membuat order baru sekaligus seluruh item-nya dalam 1 transaksi.
 * data.items berupa array OrderItem yang sudah di-snapshot
 * (price, productName, dll sudah final, ditentukan di service layer).
 */
export const createOrderWithItems = async (data) => {
  return await prisma.order.create({
    data,
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
      user: true,
    },
  });
};

/**
 * Mencari satu order berdasarkan ID, beserta seluruh item & relasinya.
 * Dipakai baik untuk user (cek kepemilikan) maupun admin (detail order).
 */
export const findOrderById = async (id) => {
  return await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
      user: true,
    },
  });
};

/**
 * Mengambil histori order milik 1 user, terbaru di atas.
 * Dipakai untuk halaman profile -> riwayat pesanan.
 */
export const findOrdersByUserId = async (userId) => {
  return await prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Mengambil SEMUA order (lintas user), dipakai untuk halaman admin/owner.
 * Bisa difilter berdasarkan status (misal: mau lihat yang PENDING saja).
 */
export const findAllOrders = async (status) => {
  return await prisma.order.findMany({
    where: status ? { status } : undefined,
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Update status order (dipakai admin lewat tombol Konfirmasi/Batal/Selesai).
 */
export const updateOrderStatus = async (id, status) => {
  return await prisma.order.update({
    where: { id },
    data: { status },
  });
};

/**
 * Update field whatsappMessage setelah pesan WA berhasil di-generate.
 * Dipisah dari createOrderWithItems karena pesan WA biasanya
 * di-generate SETELAH order tersimpan (butuh order.id untuk referensi).
 */
export const updateWhatsappMessage = async (id, whatsappMessage) => {
  return await prisma.order.update({
    where: { id },
    data: { whatsappMessage },
  });
};

/**
 * Menghapus order (jarang dipakai di flow normal, biasanya cukup CANCELLED).
 * Disediakan untuk kebutuhan administratif/cleanup data jika diperlukan.
 */
export const deleteOrder = async (id) => {
  return await prisma.order.delete({
    where: { id },
  });
};

/**
 * Menghitung jumlah order milik user, dipakai untuk pagination
 * di halaman histori profile kalau datanya nanti banyak.
 */
export const countOrdersByUserId = async (userId) => {
  return await prisma.order.count({
    where: { userId },
  });
};