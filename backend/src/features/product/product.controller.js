import { asyncHandler } from "../../middlewares/asyncHandler.js";
import * as productService from "./product.service.js";

/**
 * Controller produk.
 *
 * Endpoint baca bersifat publik (dipakai halaman Menu & detail produk),
 * sedangkan tulis dibatasi admin lewat middleware di product.routes.js.
 *
 * Perhatikan bedanya create vs update: body create divalidasi middleware,
 * sedangkan body update diteruskan mentah ke service — alasannya dijelaskan
 * di updateProductHandler.
 */

// POST /products (admin)
export const createProductHandler = asyncHandler(async (req, res) => {
   // req.body sudah pasti valid, divalidasi oleh middleware validate()
   const product = await productService.createProduct(req.body);

   res.status(201).json({
      success: true,
      message: "Product berhasil dibuat",
      data: product,
   });
});

// GET /products/:id
export const getProductHandler = asyncHandler(async (req, res) => {
   // req.params sudah pasti valid (id berupa UUID)
   const product = await productService.getProductById(req.params.id);

   res.status(200).json({
      success: true,
      data: product,
   });
});

// GET /products?category=...
export const getAllProductsHandler = asyncHandler(async (req, res) => {
   // ?category=... opsional, dipakai filter kategori di halaman Menu
   const products = await productService.getAllProducts(req.query.category);

   res.status(200).json({
      success: true,
      data: products,
   });
});

// GET /products/count?category=...
export const getProductCountHandler = asyncHandler(async (req, res) => {
   // ?category=... opsional; dipakai dashboard analytics untuk angka "Total Products"
   const count = await productService.getProductCount(req.query.category);

   res.status(200).json({
      success: true,
      data: { count },
   });
});

// GET /products/search?keyword=... — keyword kosong ditolak service (400)
export const searchProductsHandler = asyncHandler(async (req, res) => {
   const { keyword } = req.query;
   const products = await productService.searchProducts(keyword);

   res.status(200).json({
      success: true,
      data: products,
   });
});

// PATCH /products/:id (admin)
export const updateProductHandler = asyncHandler(async (req, res) => {
   // params sudah divalidasi middleware, body sengaja diteruskan mentah
   // karena validasi body bergantung pada Product.type yang ada di DB
   // (ditangani updateProductSchemaMap di service layer)
   const product = await productService.updateProduct(req.params.id, req.body);

   res.status(200).json({
      success: true,
      message: "Product berhasil diupdate",
      data: product,
   });
});

// DELETE /products/:id (admin)
export const deleteProductHandler = asyncHandler(async (req, res) => {
   await productService.removeProduct(req.params.id);

   res.status(200).json({
      success: true,
      message: "Product berhasil dihapus",
   });
});
