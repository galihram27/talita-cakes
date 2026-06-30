// src/features/order/order.route.js
import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/role.middleware.js';
import { validate } from '../../middlewares/validate.js';
import {
  orderIdParamSchema,
  updateOrderStatusSchema,
} from './order.validation.js';
import * as orderController from './order.controller.js';

const router = Router();

// semua endpoint order wajib login
router.use(authMiddleware);

// ===== CUSTOMER =====
router.post('/preview', orderController.previewCheckoutHandler);
router.post('/confirm', orderController.confirmCheckoutHandler);
router.get('/', orderController.getOrderHistoryHandler);
router.get(
  '/:id',
  validate(orderIdParamSchema, 'params'),
  orderController.getOrderByIdHandler
);

// ===== ADMIN =====
router.get(
  '/admin/all',
  requireRole('ADMIN'),
  orderController.getAllOrdersForAdminHandler
);

router.patch(
  '/admin/:id/status',
  requireRole('ADMIN'),
  validate(orderIdParamSchema, 'params'),
  validate(updateOrderStatusSchema, 'body'),
  orderController.updateOrderStatusHandler
);

export default router;