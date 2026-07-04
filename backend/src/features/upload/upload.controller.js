import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { uploadImageBuffer } from "../../utils/cloudinary.js";
import { AppError } from "../../utils/appError.js";

// POST /uploads/images  (auth required, multipart/form-data field "image")
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
