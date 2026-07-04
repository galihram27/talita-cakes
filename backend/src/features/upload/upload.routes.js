import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { uploadImageController } from "./upload.controller.js";
import { AppError } from "../../utils/appError.js";

const upload = multer({
   storage: multer.memoryStorage(),
   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
   fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith("image/")) {
         return cb(new AppError("File harus berupa gambar", 400));
      }
      cb(null, true);
   },
});

const router = Router();

// POST /uploads/images — user login boleh upload (design reference, dll)
router.post("/images", authMiddleware, upload.single("image"), uploadImageController);

export default router;
