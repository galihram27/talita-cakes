// src/features/analytics/analytics.controller.js
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import * as analyticsService from "./analytics.service.js";

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