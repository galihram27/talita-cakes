// src/features/analytics/analytics.routes.js
import { Router } from "express";
import {
   authMiddleware,
   optionalAuthMiddleware,
} from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.js";
import {
   dashboardStatsQuerySchema,
   recordVisitBodySchema,
} from "./analytics.validation.js";
import * as analyticsController from "./analytics.controller.js";

const router = Router();

// Pencatatan kunjungan bersifat publik (pengunjung tidak harus login),
// jadi harus didaftarkan SEBELUM gerbang admin di bawah. optionalAuth cuma
// dipakai untuk mengaitkan kunjungan ke akun kalau kebetulan sedang login.
router.post(
   "/visit",
   optionalAuthMiddleware,
   validate(recordVisitBodySchema, "body"),
   analyticsController.recordVisitHandler
);

// selain itu, semua endpoint analytics khusus admin
router.use(authMiddleware, requireRole("ADMIN"));

router.get(
   "/dashboard",
   validate(dashboardStatsQuerySchema, "query"),
   analyticsController.getDashboardStatsHandler
);

router.get(
   "/visitors",
   validate(dashboardStatsQuerySchema, "query"),
   analyticsController.getVisitorStatsHandler
);

router.get(
   "/orders",
   validate(dashboardStatsQuerySchema, "query"),
   analyticsController.getOrderStatsHandler
);

export default router;