import { Router } from "express";
import {
   getAllGalleriesController,
   getGalleryByIdController,
   createGalleryController,
   updateGalleryController,
   deleteGalleryController,
} from "./gallery.controller.js";
import { validate } from "../../middlewares/validate.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { ROLE } from "../auth/auth.role.js";
import {
   createGallerySchema,
   updateGallerySchema,
   getGalleriesQuerySchema,
} from "./gallery.validation.js";

const router = Router();

// =========================
// PUBLIC ROUTES (user bisa lihat & search)
// =========================

// GET /galleries?search=&page=&limit=
router.get(
   "/",
   validate(getGalleriesQuerySchema, "query"),
   getAllGalleriesController
);

// GET /galleries/:id
router.get("/:id", getGalleryByIdController);

// =========================
// ADMIN ONLY ROUTES
// =========================

// POST /galleries
router.post(
   "/",
   authMiddleware,
   requireRole(ROLE.ADMIN),
   validate(createGallerySchema),
   createGalleryController
);

// PATCH /galleries/:id
router.patch(
   "/:id",
   authMiddleware,
   requireRole(ROLE.ADMIN),
   validate(updateGallerySchema),
   updateGalleryController
);

// DELETE /galleries/:id
router.delete(
   "/:id",
   authMiddleware,
   requireRole(ROLE.ADMIN),
   deleteGalleryController
);

export default router;