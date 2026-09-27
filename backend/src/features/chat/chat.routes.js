import { Router } from "express";
import { chatController } from "./chat.controller.js";
import { validate } from "../../middlewares/validate.js";
import { chatSchema } from "./chat.validation.js";

/**
 * Endpoint asisten belanja (prefix /api/chat).
 * Publik, karena pengunjung yang belum login pun boleh bertanya. Pembatasan
 * rate menyusul di Tahap 5 RENCANA-CHATBOT.md, dan wajib ada sebelum fitur
 * ini dinyalakan di produksi.
 */
const router = Router();

// =========================
// PUBLIC ROUTES
// =========================

// POST /chat
router.post("/", validate(chatSchema), chatController);

export default router;
