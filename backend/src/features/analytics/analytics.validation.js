// src/features/analytics/analytics.validation.js
import { z } from "zod";

/**
 * Body POST /analytics/visit.
 * visitorId dibuat frontend (crypto.randomUUID) dan disimpan di localStorage.
 * Dibatasi format UUID supaya tidak bisa diisi string sembarangan.
 */
export const recordVisitBodySchema = z.object({
   visitorId: z.string().uuid({ message: "visitorId harus UUID" }).optional(),
});

/**
 * Query string untuk semua endpoint statistik admin
 * (/dashboard, /visitors, /orders).
 *
 * from & to opsional — kalau dua-duanya kosong artinya "semua data sejak awal".
 * `coerce` dipakai karena query string selalu berupa teks, jadi perlu diubah
 * dulu jadi Date. groupBy menentukan grafik dikelompokkan harian atau bulanan.
 */
export const dashboardStatsQuerySchema = z.object({
   from: z.coerce.date({ message: "Parameter 'from' tidak valid" }).optional(),
   to: z.coerce.date({ message: "Parameter 'to' tidak valid" }).optional(),
   groupBy: z.enum(["day", "month"]).optional().default("day"),
});
