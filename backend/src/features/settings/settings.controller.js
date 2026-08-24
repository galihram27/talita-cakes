import { asyncHandler } from "../../middlewares/asyncHandler.js";
import AppError from "../../utils/appError.js";
import { getSetting, setSetting, isAllowedKey } from "./settings.service.js";

/**
 * Controller pengaturan situs. Hanya dua endpoint: baca satu setting
 * (bebas diakses siapa saja) dan ubah nilainya (khusus admin).
 */

// GET /settings/:key  (public)
// Key dicek di sini juga supaya key tak dikenal langsung dibalas 404,
// tanpa perlu menembak DB atau mengisi cache dengan key sampah.
export const getSettingController = asyncHandler(async (req, res) => {
   if (!isAllowedKey(req.params.key)) {
      throw new AppError("Pengaturan tidak dikenal", 404);
   }

   const value = await getSetting(req.params.key);

   return res.status(200).json({
      message: "Setting fetched successfully",
      data: { key: req.params.key, value },
   });
});

// PUT /settings/:key  (admin only)
// Validasi key & nilainya dilakukan service, jadi di sini cukup teruskan.
export const updateSettingController = asyncHandler(async (req, res) => {
   const setting = await setSetting(req.params.key, req.body?.value);

   return res.status(200).json({
      message: "Setting updated successfully",
      data: { key: setting.key, value: setting.value },
   });
});
