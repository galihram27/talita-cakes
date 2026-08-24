import { Router } from "express";
import {
   createProductHandler,
   getProductHandler,
   getAllProductsHandler,
   getProductCountHandler,
   searchProductsHandler,
   updateProductHandler,
   deleteProductHandler,
} from "./product.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.js";
import {
   createProductSchema,
   productIdParamSchema,
} from "./product.validation.js";

/**
 * Endpoint produk (prefix /api/products).
 *
 * Route baca terbuka untuk umum; route tulis dipasangi authMiddleware +
 * requireRole("ADMIN"). Urutan pendaftaran penting: route dengan path tetap
 * ("/count", "/search") harus di atas "/:id".
 */
const router = Router();

// ===== PUBLIC =====
router.get("/", getAllProductsHandler);
// harus di atas "/:id" supaya "count" tidak tertangkap sebagai id produk
router.get("/count", getProductCountHandler);
router.get("/search", searchProductsHandler);
router.get("/:id", validate(productIdParamSchema, "params"), getProductHandler);

// ===== ADMIN =====
router.post(
   "/",
   authMiddleware,
   requireRole("ADMIN"),
   validate(createProductSchema, "body"),
   createProductHandler
);

// updateProductHandler: params divalidasi middleware, tapi body TIDAK —
// skema body-nya tergantung `type` produk yang baru diketahui setelah query DB,
// jadi validasinya dikerjakan di product.service.js.
router.patch(
   "/:id",
   authMiddleware,
   requireRole("ADMIN"),
   validate(productIdParamSchema, "params"),
   updateProductHandler
);

router.delete(
   "/:id",
   authMiddleware,
   requireRole("ADMIN"),
   validate(productIdParamSchema, "params"),
   deleteProductHandler
);

export default router;
