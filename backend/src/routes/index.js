import { Router } from "express";
import authRoutes from "../features/auth/auth.routes.js";
import productRoutes from "../features/product/product.routes.js";
import cartRoutes from "../features/cart/cart.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/carts", cartRoutes);

export default router;