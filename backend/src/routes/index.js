import { Router } from "express";
import authRoutes from "../features/auth/auth.routes.js";
import productRoutes from "../features/product/product.routes.js";
import cartRoutes from "../features/cart/cart.routes.js";
import orderRoutes from "../features/order/order.routes.js";
import galleryRoutes from "../features/gallery/gallery.routes.js";
import analyticsRoutes from "../features/analytics/analytics.routes.js";
import uploadRoutes from "../features/upload/upload.routes.js";
import reviewRoutes from "../features/review/review.routes.js";
import settingsRoutes from "../features/settings/settings.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/carts", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/galleries", galleryRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/uploads", uploadRoutes);
router.use("/reviews", reviewRoutes);
router.use("/settings", settingsRoutes);

export default router;