import { Router } from "express";
import { getGoogleReviewsController } from "./review.controller.js";

const router = Router();

// =========================
// PUBLIC ROUTES
// =========================

// GET /reviews/google
router.get("/google", getGoogleReviewsController);

export default router;
