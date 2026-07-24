import { Router } from "express";
import {
   getSettingController,
   updateSettingController,
} from "./settings.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { ROLE } from "../auth/auth.role.js";

const router = Router();

// =========================
// PUBLIC
// =========================

// GET /settings/:key
router.get("/:key", getSettingController);

// =========================
// ADMIN ONLY
// =========================

// PUT /settings/:key
router.put(
   "/:key",
   authMiddleware,
   requireRole(ROLE.ADMIN),
   updateSettingController
);

export default router;
