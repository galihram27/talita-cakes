// src/features/analytics/analytics.repository.js
import prisma from "../../lib/prisma.js";

// =========================
// VISITOR LOG
// =========================

/**
 * Upsert visitor log harian.
 * Kombinasi visitorId + date adalah unique constraint di schema,
 * jadi kalau visitor yang sama akses lagi di hari yang sama,
 * tidak akan membuat row baru (cukup "update kosong").
 */
export const upsertVisitorLog = async (visitorId, date, userId) => {
   return prisma.visitorLog.upsert({
      where: {
         visitorId_date: { visitorId, date },
      },
      update: {}, // tidak ada yang perlu diubah, ini murni dedupe
      create: { visitorId, date, userId },
   });
};

// tambahan di analytics.repository.js

/**
 * Hitung total unique visitor sepanjang waktu (tanpa filter tanggal).
 * Dipakai untuk kebutuhan "total visitor sejak rilis".
 */
export const countAllVisitors = async () => {
   return prisma.visitorLog.count();
};

/**
 * Hitung total order sepanjang waktu (tanpa filter tanggal).
 */
export const countAllOrders = async () => {
   return prisma.order.count();
};

/**
 * Visitor per tanggal TANPA batas rentang (semua data yang ada).
 */
export const countVisitorsGroupedByDate = async () => {
   return prisma.visitorLog.groupBy({
      by: ["date"],
      _count: { visitorId: true },
      orderBy: { date: "asc" },
   });
};

/**
 * Visitor per bulan TANPA batas rentang.
 */
export const countVisitorsGroupedByMonth = async () => {
   return prisma.$queryRaw`
      SELECT DATE_TRUNC('month', "date") AS month, COUNT(*)::int AS count
      FROM visitor_logs
      GROUP BY DATE_TRUNC('month', "date")
      ORDER BY month ASC
   `;
};

/**
 * Order per tanggal TANPA batas rentang.
 */
export const countOrdersGroupedByDate = async () => {
   return prisma.$queryRaw`
      SELECT DATE("createdAt") AS date, COUNT(*)::int AS count
      FROM orders
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
   `;
};

/**
 * Order per bulan TANPA batas rentang.
 */
export const countOrdersGroupedByMonth = async () => {
   return prisma.$queryRaw`
      SELECT DATE_TRUNC('month', "createdAt") AS month, COUNT(*)::int AS count
      FROM orders
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
   `;
};

/**
 * Hitung jumlah unique visitor per tanggal dalam rentang waktu tertentu.
 * Karena 1 row VisitorLog = 1 visitor di 1 hari (dijamin oleh unique constraint),
 * tinggal groupBy date + count row, tidak perlu distinct lagi.
 */
export const countVisitorsByDateRange = async (startDate, endDate) => {
   return prisma.visitorLog.groupBy({
      by: ["date"],
      where: {
         date: { gte: startDate, lte: endDate },
      },
      _count: { visitorId: true },
      orderBy: { date: "asc" },
   });
};

/**
 * Hitung total unique visitor per bulan dalam rentang waktu tertentu.
 * Pakai raw query karena Prisma groupBy belum bisa truncate tanggal ke bulan.
 */
export const countVisitorsByMonthRange = async (startDate, endDate) => {
   return prisma.$queryRaw`
      SELECT DATE_TRUNC('month', "date") AS month, COUNT(*)::int AS count
      FROM visitor_logs
      WHERE "date" BETWEEN ${startDate} AND ${endDate}
      GROUP BY DATE_TRUNC('month', "date")
      ORDER BY month ASC
   `;
};

// =========================
// ORDER ANALYTICS
// =========================

/**
 * Hitung jumlah order per tanggal dalam rentang waktu tertentu.
 * Pakai raw query karena perlu cast createdAt (DateTime + jam) ke tanggal saja.
 */
export const countOrdersByDateRange = async (startDate, endDate) => {
   return prisma.$queryRaw`
      SELECT DATE("createdAt") AS date, COUNT(*)::int AS count
      FROM orders
      WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
   `;
};

/**
 * Hitung jumlah order per bulan dalam rentang waktu tertentu.
 */
export const countOrdersByMonthRange = async (startDate, endDate) => {
   return prisma.$queryRaw`
      SELECT DATE_TRUNC('month', "createdAt") AS month, COUNT(*)::int AS count
      FROM orders
      WHERE "createdAt" BETWEEN ${startDate} AND ${endDate}
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month ASC
   `;
};