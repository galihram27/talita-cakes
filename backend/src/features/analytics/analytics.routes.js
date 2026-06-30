// src/features/analytics/analytics.routes.js
import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.js";
import { dashboardStatsQuerySchema } from "./analytics.validation.js";
import * as analyticsController from "./analytics.controller.js";

const router = Router();

// semua endpoint analytics khusus admin
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