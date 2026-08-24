import {
   getAllGalleries,
   getGalleryById,
   createGalleryItem,
   updateGalleryItem,
   deleteGalleryItem,
} from "./gallery.service.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

/**
 * Controller galeri. Membaca boleh siapa saja; menambah, mengubah, dan
 * menghapus dibatasi admin lewat middleware di gallery.routes.js.
 */

// GET /galleries  (public, dengan search & pagination)
// `meta` dipisah dari `data` supaya frontend punya info total & jumlah halaman
export const getAllGalleriesController = asyncHandler(async (req, res) => {
   const result = await getAllGalleries(req.query);

   return res.status(200).json({
      message: "Galleries fetched successfully",
      data: result.data,
      meta: result.meta,
   });
});

// GET /galleries/:id  (public)
export const getGalleryByIdController = asyncHandler(async (req, res) => {
   const gallery = await getGalleryById(req.params.id);

   return res.status(200).json({
      message: "Gallery fetched successfully",
      data: gallery,
   });
});

// POST /galleries  (admin only)
export const createGalleryController = asyncHandler(async (req, res) => {
   const gallery = await createGalleryItem(req.body);

   return res.status(201).json({
      message: "Gallery created successfully",
      data: gallery,
   });
});

// PUT /galleries/:id  (admin only)
export const updateGalleryController = asyncHandler(async (req, res) => {
   const gallery = await updateGalleryItem(req.params.id, req.body);

   return res.status(200).json({
      message: "Gallery updated successfully",
      data: gallery,
   });
});

// DELETE /galleries/:id  (admin only)
export const deleteGalleryController = asyncHandler(async (req, res) => {
   await deleteGalleryItem(req.params.id);

   return res.status(200).json({
      message: "Gallery deleted successfully",
   });
});
