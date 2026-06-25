import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { AppError } from '../../utils/appError.js';
import {
  createProductSchema,
  updateProductSchemaMap,
  productIdParamSchema,
} from './product.validation.js';
import * as productService from './product.service.js';

/**
 * Handler untuk membuat produk baru.
 * Memvalidasi request body sebelum mengirimkannya ke layer service.
 */
export const createProductHandler = asyncHandler(async (req, res) => {
  // Validasi data input produk menggunakan Zod
  const parsed = createProductSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError('Validasi gagal', 422, parsed.error.flatten());
  }

  // Meneruskan data yang valid ke service layer
  const product = await productService.createProduct(parsed.data);

  res.status(201).json({
    success: true,
    message: 'Product berhasil dibuat',
    data: product,
  });
});

/**
 * Handler untuk mengambil detail satu produk berdasarkan parameter ID.
 */
export const getProductHandler = asyncHandler(async (req, res) => {
  // Validasi parameter ID pada URL path
  const parsedParams = productIdParamSchema.safeParse(req.params);

  if (!parsedParams.success) {
    throw new AppError('Id tidak valid', 400, parsedParams.error.flatten());
  }

  const product = await productService.getProductById(parsedParams.data.id);

  res.status(200).json({
    success: true,
    data: product,
  });
});

/**
 * Handler untuk mengambil semua daftar produk yang tersedia.
 */
export const getAllProductsHandler = asyncHandler(async (req, res) => {
  const products = await productService.getAllProducts();

  res.status(200).json({
    success: true,
    data: products,
  });
});

/**
 * Mencari produk berdasarkan keyword (nama, description, atau flavor).
 */
export const searchProductsHandler = asyncHandler(async (req, res) => {
  const { keyword } = req.query;

  const products = await productService.searchProducts(keyword);

  res.status(200).json({
    success: true,
    data: products,
  });
});

/**
 * Handler untuk memperbarui data produk berdasarkan parameter ID.
 */
export const updateProductHandler = asyncHandler(async (req, res) => {
  // Validasi parameter ID pada URL path
  const parsedParams = productIdParamSchema.safeParse(req.params);

  if (!parsedParams.success) {
    throw new AppError('Id tidak valid', 400, parsedParams.error.flatten());
  }

  // ID yang valid dan data body dikirim ke service (validasi body diproses di service)
  const product = await productService.updateProduct(parsedParams.data.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Product berhasil diupdate',
    data: product,
  });
});

/**
 * Handler untuk menghapus produk berdasarkan parameter ID.
 */
export const deleteProductHandler = asyncHandler(async (req, res) => {
  // Validasi parameter ID pada URL path
  const parsedParams = productIdParamSchema.safeParse(req.params);

  if (!parsedParams.success) {
    throw new AppError('Id tidak valid', 400, parsedParams.error.flatten());
  }

  await productService.removeProduct(parsedParams.data.id);

  res.status(200).json({
    success: true,
    message: 'Product berhasil dihapus',
  });
});