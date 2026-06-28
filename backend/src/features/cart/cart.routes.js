// src/features/cart/cart.route.js
import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.js';
import {
  addItemSchema,
  updateQuantitySchema,
  cartItemIdParamSchema,
} from './cart.validation.js';
import * as cartController from './cart.controller.js';

const router = Router();

router.use(authMiddleware); // semua endpoint cart wajib login

router.get('/', cartController.getCart);

router.post(
  '/items',
  validate(addItemSchema, 'body'),
  cartController.addItemToCart
);

router.patch(
  '/items/:itemId',
  validate(cartItemIdParamSchema, 'params'),
  validate(updateQuantitySchema, 'body'),
  cartController.updateItemQuantity
);

router.delete(
  '/items/:itemId',
  validate(cartItemIdParamSchema, 'params'),
  cartController.removeItem
);

router.delete('/', cartController.clearCart);

export default router;