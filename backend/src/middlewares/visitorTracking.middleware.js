// src/middlewares/visitorTracking.middleware.js
import { v4 as uuidv4 } from "uuid";
import { recordVisit } from "../features/analytics/analytics.service.js";

const VISITOR_COOKIE_NAME = "visitorId";
const VISITOR_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 tahun

/**
 * Pasang cookie visitorId kalau belum ada, lalu catat kunjungan hari ini.
 * Sengaja tidak pernah throw / block request — analytics gagal
 * tidak boleh mengganggu pengalaman user biasa.
 */
export const visitorTrackingMiddleware = (req, res, next) => {
   let visitorId = req.cookies?.[VISITOR_COOKIE_NAME];

   if (!visitorId) {
      visitorId = uuidv4();
      const isProd = process.env.NODE_ENV === "production";
      res.cookie(VISITOR_COOKIE_NAME, visitorId, {
         httpOnly: false, // boleh dibaca JS kalau nanti perlu dipakai frontend
         secure: isProd,
         // beda domain di production (Vercel <-> Render) butuh "none" + secure
         sameSite: isProd ? "none" : "lax",
         maxAge: VISITOR_COOKIE_MAX_AGE,
      });
   }

   // fire-and-forget, jangan await supaya tidak menahan response
   recordVisit(visitorId, req.user?.userId ?? null).catch((err) => {
      console.error("Gagal mencatat visitor log:", err);
   });

   next();
};

export default visitorTrackingMiddleware;