import jwt from "jsonwebtoken";

/**
 * Pembuatan dua jenis token JWT yang dipakai sistem login.
 *
 * - Access token  : umur pendek (1 jam), dikirim di header Authorization pada
 *                   tiap request. Isinya userId + role, supaya middleware bisa
 *                   memeriksa hak akses tanpa query DB.
 * - Refresh token : umur panjang (7 hari), disimpan di cookie httpOnly dan
 *                   dipakai untuk menerbitkan access token baru. Isinya hanya
 *                   userId — role sengaja tidak disertakan supaya perubahan
 *                   role tidak "terkunci" di token lama.
 *
 * Keduanya ditandatangani dengan secret yang BERBEDA, jadi refresh token tidak
 * bisa dipakai sebagai access token, dan sebaliknya.
 *
 * Catatan: masa berlaku 7 hari di sini harus sejalan dengan REFRESH_TOKEN_TTL_MS
 * di auth.service.js dan REFRESH_TOKEN_MAX_AGE di cookie.js.
 */
export const generateAccessToken = (user) => {
   return jwt.sign(
      {
         userId: user.id,
         role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
   );
};

export const generateRefreshToken = (user) => {
   return jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: "7d",
   });
};
