import AppError from "../../utils/appError.js";
import {
   findAllGalleries,
   findGalleryById,
   createGallery,
   updateGallery,
   deleteGallery,
} from "./gallery.repository.js";

// =========================
// GET ALL (user & admin)
// Support: ?search=&page=&limit=
// =========================
export const getAllGalleries = async ({ search = "", page = 1, limit = 10 } = {}) => {
   const take = Math.min(Number(limit) || 10, 100); // max 100 per page
   const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

   const { data, total } = await findAllGalleries({ search, skip, take });

   return {
      data,
      meta: {
         total,
         page: Math.max(Number(page) || 1, 1),
         limit: take,
         totalPages: Math.ceil(total / take),
      },
   };
};

// =========================
// GET ONE
// =========================
export const getGalleryById = async (id) => {
   const gallery = await findGalleryById(id);

   if (!gallery) {
      throw new AppError("Gallery not found", 404);
   }

   return gallery;
};

// =========================
// CREATE (admin only)
// =========================
export const createGalleryItem = async (data) => {
   // tags bisa dikirim sebagai string "a,b,c" atau array ["a","b","c"]
   const tags = normalizeTags(data.tags);

   return createGallery({ ...data, tags });
};

// =========================
// UPDATE (admin only)
// =========================
export const updateGalleryItem = async (id, data) => {
   // pastikan gallery ada dulu
   await getGalleryById(id);

   // hanya normalize tags kalau memang dikirim, supaya field lain yang
   // tidak disertakan di body tidak ikut tertimpa
   const payload = { ...data };
   if (data.tags !== undefined) {
      payload.tags = normalizeTags(data.tags);
   }

   return updateGallery(id, payload);
};

// =========================
// DELETE (admin only)
// =========================
export const deleteGalleryItem = async (id) => {
   // pastikan gallery ada dulu
   await getGalleryById(id);

   await deleteGallery(id);
};

// =========================
// HELPER
// =========================

// Normalisasi tags: terima string "a,b,c" atau array ["a","b","c"], selalu return array bersih
const normalizeTags = (tags) => {
   if (!tags) return [];
   if (Array.isArray(tags)) return tags.map((t) => t.trim()).filter(Boolean);
   if (typeof tags === "string") return tags.split(",").map((t) => t.trim()).filter(Boolean);
   return [];
};