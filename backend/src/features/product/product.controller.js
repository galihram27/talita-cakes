import { asyncHandler } from '../../middlewares/asyncHandler.js';
import * as productService from './product.service.js';

export const createProductHandler = asyncHandler(async (req, res) => {
  // req.body sudah pasti valid, divalidasi oleh middleware validate()
  const product = await productService.createProduct(req.body);

  res.status(201).json({
    success: true,
    message: 'Product berhasil dibuat',
    data: product,
  });
});

export const getProductHandler = asyncHandler(async (req, res) => {
  // req.params sudah pasti valid (id berupa UUID)
  const product = await productService.getProductById(req.params.id);

  res.status(200).json({
    success: true,
    data: product,
  });
});

export const getAllProductsHandler = asyncHandler(async (req, res) => {
  const products = await productService.getAllProducts();

  res.status(200).json({
    success: true,
    data: products,
  });
});

export const searchProductsHandler = asyncHandler(async (req, res) => {
  const { keyword } = req.query;
  const products = await productService.searchProducts(keyword);

  res.status(200).json({
    success: true,
    data: products,
  });
});

export const updateProductHandler = asyncHandler(async (req, res) => {
  // params sudah divalidasi middleware, body sengaja diteruskan mentah
  // karena validasi body bergantung pada Product.type yang ada di DB
  // (ditangani updateProductSchemaMap di service layer)
  const product = await productService.updateProduct(req.params.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Product berhasil diupdate',
    data: product,
  });
});

export const deleteProductHandler = asyncHandler(async (req, res) => {
  await productService.removeProduct(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Product berhasil dihapus',
  });
});