// src/features/analytics/analytics.service.js
import { AppError } from "../../utils/appError.js";
import * as analyticsRepository from "./analytics.repository.js";

// =========================
// VISITOR TRACKING (dipanggil dari middleware, bukan dari controller)
// =========================

/**
 * Penjaga dedupe di memory: menyimpan visitorId yang SUDAH tercatat hari ini,
 * supaya request berikutnya dari visitor yang sama tidak menyentuh DB lagi.
 *
 * Tanpa ini, setiap request menjalankan satu transaksi upsert ke DB (walau
 * hasilnya "update kosong" karena unique constraint) -> boros egress/quota.
 * Dengan ini, DB hanya ditulis maksimal 1x per visitor per hari per instance.
 *
 * Set di-reset otomatis saat ganti hari, jadi memory tidak tumbuh tanpa batas
 * (paling banyak menampung unique visitor dalam 1 hari).
 */
let seenDayKey = null;
let seenVisitorsToday = new Set();

const toDayKey = (date) =>
   `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

export const recordVisit = async (visitorId, userId = null) => {
   if (!visitorId) return;

   const today = new Date();
   today.setHours(0, 0, 0, 0);

   const dayKey = toDayKey(today);

   // ganti hari -> buang catatan kemarin, mulai set baru
   if (dayKey !== seenDayKey) {
      seenDayKey = dayKey;
      seenVisitorsToday = new Set();
   }

   // sudah tercatat hari ini -> tidak perlu menyentuh DB sama sekali
   if (seenVisitorsToday.has(visitorId)) return;

   // tandai lebih dulu supaya request paralel dari visitor yang sama
   // tidak sama-sama menembak DB (at-most-once per hari per instance)
   seenVisitorsToday.add(visitorId);

   try {
      await analyticsRepository.upsertVisitorLog(visitorId, today, userId);
   } catch (err) {
      // gagal tulis (mis. kuota DB habis) -> lepas lagi supaya bisa dicoba
      // ulang di kesempatan berikutnya, bukan hilang seharian
      seenVisitorsToday.delete(visitorId);
      throw err;
   }
};

// =========================
// DASHBOARD ANALYTICS (dipanggil dari controller admin)
// =========================

/**
 * Validasi & normalisasi rentang tanggal.
 * Mengembalikan null kalau from/to memang tidak diisi (artinya: semua data).
 */
const normalizeDateRange = (from, to) => {
   // kalau dua-duanya kosong, anggap owner mau lihat total sejak awal
   if (!from && !to) return null;

   // kalau cuma salah satu yang diisi, ini ambigu -> tolak biar jelas
   if (!from || !to) {
      throw new AppError("Parameter 'from' dan 'to' harus diisi bersamaan", 422);
   }

   const startDate = new Date(from);
   startDate.setHours(0, 0, 0, 0);

   const endDate = new Date(to);
   endDate.setHours(23, 59, 59, 999);

   if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new AppError("Format tanggal tidak valid", 422);
   }

   if (startDate > endDate) {
      throw new AppError("'from' tidak boleh lebih besar dari 'to'", 422);
   }

   return { startDate, endDate };
};

/**
 * Ambil data visitor untuk grafik.
 * Kalau from/to tidak diisi, ambil SEMUA data sejak awal (tanpa filter tanggal).
 */
export const getVisitorStats = async (from, to, groupBy = "day") => {
   const range = normalizeDateRange(from, to);

   let rows;
   if (!range) {
      rows =
         groupBy === "month"
            ? await analyticsRepository.countVisitorsGroupedByMonth()
            : await analyticsRepository.countVisitorsGroupedByDate();
   } else {
      rows =
         groupBy === "month"
            ? await analyticsRepository.countVisitorsByMonthRange(range.startDate, range.endDate)
            : await analyticsRepository.countVisitorsByDateRange(range.startDate, range.endDate);
   }

   return rows.map((row) => ({
      date: row.date ?? row.month,
      count: Number(row._count?.visitorId ?? row.count),
   }));
};

/**
 * Ambil data order untuk grafik.
 * Kalau from/to tidak diisi, ambil SEMUA data sejak awal (tanpa filter tanggal).
 */
export const getOrderStats = async (from, to, groupBy = "day") => {
   const range = normalizeDateRange(from, to);

   let rows;
   if (!range) {
      rows =
         groupBy === "month"
            ? await analyticsRepository.countOrdersGroupedByMonth()
            : await analyticsRepository.countOrdersGroupedByDate();
   } else {
      rows =
         groupBy === "month"
            ? await analyticsRepository.countOrdersByMonthRange(range.startDate, range.endDate)
            : await analyticsRepository.countOrdersByDateRange(range.startDate, range.endDate);
   }

   return rows.map((row) => ({
      date: row.date ?? row.month,
      count: Number(row.count),
   }));
};

/**
 * Gabungan visitor + order, dilengkapi total keseluruhan (all-time)
 * supaya owner bisa lihat angka "total sejak rilis" sekaligus tanpa request terpisah.
 */
export const getDashboardStats = async (from, to, groupBy = "day") => {
   const [visitors, orders, totalVisitors, totalOrders] = await Promise.all([
      getVisitorStats(from, to, groupBy),
      getOrderStats(from, to, groupBy),
      analyticsRepository.countAllVisitors(),
      analyticsRepository.countAllOrders(),
   ]);

   return { visitors, orders, totalVisitors, totalOrders };
};