// src/middlewares/visitorTracking.middleware.js
import crypto from "crypto";
import { recordVisit } from "../features/analytics/analytics.service.js";

const VISITOR_COOKIE_NAME = "visitorId";
const VISITOR_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 tahun

const BOT_UA_PATTERN =
   /bot|crawl|spider|slurp|curl|wget|python-requests|axios\/|node-fetch|okhttp|postman|insomnia|headless|phantom|lighthouse|pingdom|uptime|monitor|healthcheck|preview|facebookexternalhit|whatsapp|telegram|discord|slack|vercel|render/i;

/**
 * ID stabil untuk request yang tidak membawa cookie visitorId.
 * Dipakai supaya browser yang memblokir cookie pihak ketiga (Safari/Brave,
 * karena frontend & backend beda domain) tidak dihitung sebagai orang baru
 * setiap kali membuka halaman.
 *
 * Sengaja TIDAK memasukkan tanggal supaya orang yang sama tetap satu ID
 * sepanjang waktu — total all-time dihitung dari DISTINCT visitorId.
 * IP + user-agent hanya disimpan dalam bentuk hash, bukan aslinya.
 */
const FINGERPRINT_SALT = process.env.VISITOR_ID_SALT || "talita-cakes-visitor";

const fingerprintVisitorId = (req) => {
   const ip = req.ip || req.socket?.remoteAddress || "unknown";
   const ua = req.get("user-agent") || "unknown";
   const hash = crypto
      .createHash("sha256")
      .update(`${FINGERPRINT_SALT}|${ip}|${ua}`)
      .digest("hex");
   return `fp_${hash.slice(0, 32)}`;
};

/**
 * Pasang cookie visitorId kalau belum ada, lalu catat kunjungan hari ini.
 * Sengaja tidak pernah throw / block request — analytics gagal
 * tidak boleh mengganggu pengalaman user biasa.
 */
export const visitorTrackingMiddleware = (req, res, next) => {
   // Preflight CORS: browser tidak pernah mengirim cookie di sini dan juga
   // membuang Set-Cookie dari responsnya, jadi kalau ikut dihitung setiap
   // preflight akan selalu tampak seperti pengunjung baru.
   if (req.method === "OPTIONS" || req.method === "HEAD") return next();

   const userAgent = req.get("user-agent");

   // Bot, crawler, health check, dan link preview bukan pengunjung.
   if (!userAgent || BOT_UA_PATTERN.test(userAgent)) return next();

   let visitorId = req.cookies?.[VISITOR_COOKIE_NAME];

   if (!visitorId) {
      visitorId = fingerprintVisitorId(req);
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
