import { Router } from "express";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import {
   chatController,
   chatStreamController,
   chatStatusController,
} from "./chat.controller.js";
import { validate } from "../../middlewares/validate.js";
import { optionalAuthMiddleware } from "../../middlewares/auth.middleware.js";
import { AppError } from "../../utils/appError.js";
import { chatSchema } from "./chat.validation.js";

/**
 * Endpoint asisten belanja (prefix /api/chat).
 * Publik, karena pengunjung yang belum login pun boleh bertanya. Kalau ia
 * login, optionalAuthMiddleware mengisi req.user sehingga tool pesanan
 * ikut tersedia.
 */
const router = Router();

const GUEST_LIMIT = 20;
const USER_LIMIT = 40;

/**
 * Endpoint chat memanggil layanan berkuota, jadi tanpa batas satu orang
 * iseng bisa menghabiskan jatah seluruh situs. Tamu dihitung per IP;
 * pengguna login dihitung per akun dan diberi batas lebih longgar, karena
 * akunnya bisa dilacak dan beberapa orang di satu wifi tidak saling
 * menghabiskan jatah.
 *
 * req.ip berisi IP asli pengunjung karena app.js memasang trust proxy.
 * ipKeyGenerator mengelompokkan alamat IPv6 per blok, supaya satu orang
 * tidak bisa berganti alamat di dalam bloknya untuk lolos dari batas.
 *
 * Penyimpanannya di memori: hilang saat server restart, dan tidak berbagi
 * hitungan kalau nanti ada lebih dari satu instance. Cukup untuk sekarang.
 */
const chatLimiter = rateLimit({
   windowMs: 10 * 60 * 1000,
   limit: (req) => (req.user ? USER_LIMIT : GUEST_LIMIT),
   keyGenerator: (req) =>
      req.user ? `user:${req.user.userId}` : ipKeyGenerator(req.ip),
   standardHeaders: "draft-8",
   legacyHeaders: false,
   // Dilempar sebagai AppError supaya bentuk jawabannya sama dengan error
   // lain dan widget cukup menangani satu bentuk.
   handler: (req, res, next) =>
      next(
         new AppError(
            "Kamu sudah banyak bertanya dalam waktu singkat. Coba lagi beberapa menit lagi, atau hubungi kami lewat WhatsApp.",
            429
         )
      ),
});

// =========================
// PUBLIC ROUTES
// =========================

// GET /chat/status
router.get("/status", chatStatusController);

// optionalAuthMiddleware harus sebelum chatLimiter, karena limiter butuh
// req.user untuk memilih batas dan kunci hitungannya.
const chatGuards = [optionalAuthMiddleware, chatLimiter, validate(chatSchema)];

// POST /chat
router.post("/", ...chatGuards, chatController);

// POST /chat/stream (jawaban dikirim bertahap, dipakai widget)
router.post("/stream", ...chatGuards, chatStreamController);

export default router;
