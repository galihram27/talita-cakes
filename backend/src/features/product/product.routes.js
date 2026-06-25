import { Router } from 'express';
import {
  createProductHandler,
  getProductHandler,
  getAllProductsHandler,
  searchProductsHandler,
  updateProductHandler,
  deleteProductHandler,
} from './product.controller.js';
import { requireRole } from "../../middlewares/role.middleware.js";

const router = Router();

router.get('/', getAllProductsHandler);
router.get('/search', searchProductsHandler);
router.get('/:id', getProductHandler);

router.post('/', requireRole('admin'), createProductHandler);
router.patch('/:id', requireRole('admin'), updateProductHandler);
router.delete('/:id', requireRole('admin'), deleteProductHandler);

export default router;