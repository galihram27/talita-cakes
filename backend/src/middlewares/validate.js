// src/middlewares/validate.js
import { AppError } from "../utils/appError.js";

/**
 * Generic validator middleware berbasis Zod.
 * target: 'body' | 'params' | 'query'
 *
 * Selain menolak data yang tidak sesuai, hasil parse Zod DITULIS BALIK ke
 * request. Jadi controller menerima data yang sudah dikonversi tipenya
 * (mis. "12" jadi angka 12, "2026-01-01" jadi Date) dan sudah terisi nilai
 * default — bukan teks mentah dari client.
 */
export const validate =
   (schema, target = "body") =>
   (req, res, next) => {
      const result = schema.safeParse(req[target]);

      if (!result.success) {
         return next(
            new AppError("Validasi gagal", 422, result.error.flatten())
         );
      }

      if (target === "query") {
         // Di Express 5 `req.query` hanya bisa dibaca (getter), jadi tidak bisa
         // ditimpa langsung seperti body/params. Solusinya: kosongkan isinya lalu
         // salin hasil parse ke objek yang sama.
         Object.keys(req.query).forEach((key) => delete req.query[key]);
         Object.assign(req.query, result.data);
      } else {
         req[target] = result.data;
      }

      next();
   };
