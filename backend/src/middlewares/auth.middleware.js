import jwt from "jsonwebtoken";

/**
 * Penjaga endpoint yang wajib login.
 *
 * Membaca access token dari header `Authorization: Bearer <token>`, lalu
 * menaruh isinya di `req.user` supaya controller & service tidak perlu
 * membongkar token lagi.
 *
 * Cukup memverifikasi tanda tangan token — tidak query DB. Karena itu
 * pengecekan akses jadi murah, dengan konsekuensi: perubahan role baru
 * berlaku setelah access token lamanya kedaluwarsa (maks 1 jam).
 */
export const authMiddleware = (req, res, next) => {
   try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
         return res.status(401).json({ message: "Token tidak ditemukan" });
      }

      const token = authHeader.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = decoded; // { userId, role } — isi payload dari utils/token.js

      next();
   } catch (err) {
      return res
         .status(401)
         .json({ message: "Token tidak valid atau kedaluwarsa" });
   }
};

/**
 * Sama seperti authMiddleware, tapi tidak pernah menolak request.
 * Dipakai di endpoint publik yang tetap ingin tahu SIAPA yang mengakses
 * kalau kebetulan sedang login (mis. pencatatan kunjungan).
 */
export const optionalAuthMiddleware = (req, res, next) => {
   const authHeader = req.headers.authorization;

   if (authHeader?.startsWith("Bearer ")) {
      try {
         req.user = jwt.verify(
            authHeader.split(" ")[1],
            process.env.JWT_SECRET
         );
      } catch {
         // token busuk / kedaluwarsa -> perlakukan sebagai tamu, jangan blokir
      }
   }

   next();
};
