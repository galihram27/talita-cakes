import { Router } from 'express';
import {
  createProductHandler,
  getProductHandler,
  getAllProductsHandler,
  searchProductsHandler,
  updateProductHandler,
  deleteProductHandler,
} from './product.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';
import { requireRole } from "../../middlewares/role.middleware.js";

const router = Router();

router.get('/', getAllProductsHandler);
router.get('/search', searchProductsHandler);
router.get('/:id', getProductHandler);

router.post('/', authMiddleware, requireRole('ADMIN'), createProductHandler);
router.patch('/:id', authMiddleware, requireRole('ADMIN'), updateProductHandler);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), deleteProductHandler);

export default router;