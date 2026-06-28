import { Router } from "express";
import {
   createProductHandler,
   getProductHandler,
   getAllProductsHandler,
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

const router = Router();

router.get("/", getAllProductsHandler);
router.get("/search", searchProductsHandler);
router.get("/:id", validate(productIdParamSchema, "params"), getProductHandler);

router.post(
   "/",
   authMiddleware,
   requireRole("ADMIN"),
   validate(createProductSchema, "body"),
   createProductHandler
);

// updateProductHandler: validasi params via middleware,
// validasi body TETAP di service (lihat penjelasan di bawah)
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
