// src/features/order/order.routes.js
import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validate.js";
import {
   orderIdParamSchema,
   updateOrderStatusSchema,
} from "./order.validation.js";
import * as orderController from "./order.controller.js";

/**
 * Endpoint pesanan (prefix /api/orders).
 *
 * Route admin memakai awalan /admin/... dan didaftarkan setelah route customer.
 * Body /preview & /confirm tidak divalidasi middleware karena skemanya berbeda
 * dan dicek langsung di order.service.js.
 */
const router = Router();

// semua endpoint order wajib login
router.use(authMiddleware);

// ===== CUSTOMER =====

// Hitung ringkasan pesanan tanpa menyimpan apa pun
router.post("/preview", orderController.previewCheckoutHandler);

// Simpan pesanan + buat link WhatsApp, keranjang dikosongkan di sini
router.post("/confirm", orderController.confirmCheckoutHandler);

// Riwayat pesanan sendiri
router.get("/", orderController.getOrderHistoryHandler);

// Detail satu pesanan sendiri
router.get(
   "/:id",
   validate(orderIdParamSchema, "params"),
   orderController.getOrderByIdHandler
);

// ===== ADMIN =====

// Semua pesanan lintas user, opsional ?status=PENDING
router.get(
   "/admin/all",
   requireRole("ADMIN"),
   orderController.getAllOrdersForAdminHandler
);

// Ubah status pesanan
router.patch(
   "/admin/:id/status",
   requireRole("ADMIN"),
   validate(orderIdParamSchema, "params"),
   validate(updateOrderStatusSchema, "body"),
   orderController.updateOrderStatusHandler
);

export default router;
