import { Router } from "express";
import { chatController, chatStreamController } from "./chat.controller.js";
import { validate } from "../../middlewares/validate.js";
import { optionalAuthMiddleware } from "../../middlewares/auth.middleware.js";
import { chatSchema } from "./chat.validation.js";

/**
 * Endpoint asisten belanja (prefix /api/chat).
 * Publik, karena pengunjung yang belum login pun boleh bertanya. Kalau ia
 * login, optionalAuthMiddleware mengisi req.user sehingga tool pesanan
 * ikut tersedia. Pembatasan rate menyusul di Tahap 5 RENCANA-CHATBOT.md,
 * dan wajib ada sebelum fitur ini dinyalakan di produksi.
 */
const router = Router();

// =========================
// PUBLIC ROUTES
// =========================

// POST /chat
router.post("/", optionalAuthMiddleware, validate(chatSchema), chatController);

// POST /chat/stream (jawaban dikirim bertahap, dipakai widget)
router.post(
   "/stream",
   optionalAuthMiddleware,
   validate(chatSchema),
   chatStreamController
);

export default router;
