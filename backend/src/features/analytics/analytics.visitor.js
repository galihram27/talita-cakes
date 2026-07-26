// src/features/analytics/analytics.visitor.js
import crypto from "crypto";

const BOT_UA_PATTERN =
   /bot|crawl|spider|slurp|curl|wget|python-requests|axios\/|node-fetch|okhttp|postman|insomnia|headless|phantom|lighthouse|pingdom|uptime|monitor|healthcheck|preview|facebookexternalhit|whatsapp|telegram|discord|slack|vercel|render/i;

/**
 * Bot, crawler, health check, dan link preview bukan pengunjung.
 * User-agent kosong juga dianggap bukan browser sungguhan.
 */
export const isBotUserAgent = (userAgent) =>
   !userAgent || BOT_UA_PATTERN.test(userAgent);

const FINGERPRINT_SALT = process.env.VISITOR_ID_SALT || "talita-cakes-visitor";

/**
 * ID cadangan untuk request yang tidak membawa visitorId dari localStorage
 * (mis. JS mati atau storage diblokir).
 *
 * PENTING: ini SENGAJA tidak dipakai sebagai jalur utama. IP berubah terus
 * (ganti WiFi <-> seluler, CGNAT operator, ISP reconnect) dan user-agent
 * berubah tiap browser update, jadi orang yang sama akan terus menghasilkan
 * hash baru dan terhitung sebagai pengunjung baru. Jalur utamanya adalah ID
 * first-party yang dibuat & disimpan frontend — lihat frontend/src/lib/visitor.js.
 *
 * IP + user-agent hanya disimpan dalam bentuk hash, bukan aslinya.
 */
export const fingerprintVisitorId = (req) => {
   const ip = req.ip || req.socket?.remoteAddress || "unknown";
   const ua = req.get("user-agent") || "unknown";
   const hash = crypto
      .createHash("sha256")
      .update(`${FINGERPRINT_SALT}|${ip}|${ua}`)
      .digest("hex");
   return `fp_${hash.slice(0, 32)}`;
};
