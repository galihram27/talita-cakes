// src/utils/cloudinary.js
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
   api_key: process.env.CLOUDINARY_API_KEY,
   api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload buffer gambar ke Cloudinary, return hasil upload
 * (yang penting: result.secure_url).
 */
export const uploadImageBuffer = (buffer, folder = "talita-cakes") =>
   new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
         {
            folder,
            resource_type: "image",
            // resize supaya tidak menyimpan gambar raksasa dari kamera HP
            transformation: [{ width: 1600, height: 1600, crop: "limit" }],
         },
         (error, result) => {
            if (error) reject(error);
            else resolve(result);
         }
      );
      stream.end(buffer);
   });
