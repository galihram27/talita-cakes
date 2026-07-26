// src/features/analytics/analytics.controller.js
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import * as analyticsService from "./analytics.service.js";
import { fingerprintVisitorId, isBotUserAgent } from "./analytics.visitor.js";

/**
 * POST /api/analytics/visit
 * Dipanggil frontend sekali per sesi. Body: { visitorId } — UUID first-party
 * dari localStorage, stabil walau IP berganti dan tidak kena blokir cookie
 * pihak ketiga (frontend Vercel <-> backend Render beda domain).
 *
 * Selalu balas 204: analytics gagal tidak boleh terasa oleh pengunjung.
 */
export const recordVisitHandler = asyncHandler(async (req, res) => {
   if (isBotUserAgent(req.get("user-agent"))) return res.status(204).end();

   // prefix supaya ID dari klien tidak pernah bentrok dengan ID fingerprint
   const visitorId = req.body.visitorId
      ? `web_${req.body.visitorId}`
      : fingerprintVisitorId(req);

   try {
      await analyticsService.recordVisit(
         visitorId,
         req.user?.userId ?? null,
         req.ip
      );
   } catch (err) {
      console.error("Gagal mencatat visitor log:", err);
   }

   res.status(204).end();
});

/**
 * GET /api/analytics/dashboard?from=2026-06-01&to=2026-06-30&groupBy=day
 * Endpoint utama untuk grafik dashboard admin (visitor + order sekaligus).
 */
export const getDashboardStatsHandler = asyncHandler(async (req, res) => {
   const { from, to, groupBy } = req.query;

   const stats = await analyticsService.getDashboardStats(from, to, groupBy);

   res.status(200).json({
      success: true,
      data: stats,
   });
});

/**
 * GET /api/analytics/visitors?from=...&to=...&groupBy=day|month
 * Endpoint terpisah, dipakai kalau frontend butuh visitor saja.
 */
export const getVisitorStatsHandler = asyncHandler(async (req, res) => {
   const { from, to, groupBy } = req.query;

   const visitors = await analyticsService.getVisitorStats(from, to, groupBy);

   res.status(200).json({
      success: true,
      data: visitors,
   });
});

/**
 * GET /api/analytics/orders?from=...&to=...&groupBy=day|month
 * Endpoint terpisah, dipakai kalau frontend butuh order saja.
 */
export const getOrderStatsHandler = asyncHandler(async (req, res) => {
   const { from, to, groupBy } = req.query;

   const orders = await analyticsService.getOrderStats(from, to, groupBy);

   res.status(200).json({
      success: true,
      data: orders,
   });
});