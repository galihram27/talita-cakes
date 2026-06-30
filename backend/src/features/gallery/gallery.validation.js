import { z } from "zod";

// Tags bisa dikirim string "a,b,c" ATAU array ["a","b","c"]
const tagsSchema = z
   .union([z.string(), z.array(z.string())])
   .optional();

// CREATE GALLERY VALIDATION
export const createGallerySchema = z.object({
   title: z.string().min(1, "Title is required"),
   imageUrl: z.string().min(1, "Image URL is required").url("Invalid image URL"),
   description: z.string().optional(),
   tags: tagsSchema,
   order: z.coerce.number().int().optional(),
});

// UPDATE GALLERY VALIDATION
// Semua field optional, tapi minimal harus ada 1 field yang diisi
export const updateGallerySchema = z
   .object({
      title: z.string().min(1, "Title is required").optional(),
      imageUrl: z.string().min(1, "Image URL is required").url("Invalid image URL").optional(),
      description: z.string().optional(),
      tags: tagsSchema,
      order: z.coerce.number().int().optional(),
   })
   .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
   });

// QUERY VALIDATION (untuk search & pagination di GET /galleries)
export const getGalleriesQuerySchema = z.object({
   search: z.string().optional(),
   page: z.coerce.number().int().min(1).optional(),
   limit: z.coerce.number().int().min(1).max(100).optional(),
});