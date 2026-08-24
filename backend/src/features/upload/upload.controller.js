import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { uploadImageBuffer } from "../../utils/cloudinary.js";
import { AppError } from "../../utils/appError.js";

/**
 * Terima file dari multer lalu kirim ke Cloudinary.
 *
 * Yang dibalas ke client: `url` untuk ditampilkan, dan `publicId` yang perlu
 * disimpan kalau nanti gambarnya mau dihapus dari Cloudinary.
 */

// POST /uploads/images  (auth required, multipart/form-data field "image")
// req.file diisi multer; kosong berarti field-nya salah nama atau tidak dikirim
export const uploadImageController = asyncHandler(async (req, res) => {
   if (!req.file) {
      throw new AppError("File gambar wajib diisi (field: image)", 400);
   }

   const result = await uploadImageBuffer(req.file.buffer);

   return res.status(201).json({
      message: "Image uploaded successfully",
      data: {
         url: result.secure_url,
         publicId: result.public_id,
      },
   });
});
