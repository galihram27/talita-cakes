import {
   register,
   login,
   verifyEmail,
   resendOtp,
   forgotPassword,
   verifyResetOtp,
   resetPassword,
   refreshToken,
   getMe,
   logout,
} from "./auth.service.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import {
   setRefreshTokenCookie,
   clearRefreshTokenCookie,
} from "../../utils/cookie.js";

/**
 * Lapisan controller: hanya mengurus HTTP.
 *
 * Tugasnya sebatas ambil data dari request, panggil service, lalu susun
 * response. Semua aturan bisnis ada di auth.service.js.
 *
 * Catatan token:
 * - accessToken dikirim di body supaya disimpan di memori frontend.
 * - refreshToken TIDAK pernah masuk body, selalu lewat cookie httpOnly
 *   biar tidak bisa dibaca JavaScript (aman dari XSS).
 *
 * `asyncHandler` membungkus tiap handler supaya error yang di-throw otomatis
 * diteruskan ke error handler global — jadi tidak perlu try/catch di sini.
 */

// =========================
// REGISTER
// =========================

// Register tidak langsung login: user cuma dibuat lalu dikirimi kode OTP.
export const registerController = asyncHandler(async (req, res) => {
   const result = await register(req.body);

   return res.status(201).json({
      message:
         "Registrasi berhasil. Silakan cek email kamu untuk kode verifikasi.",
      data: { user: result.user },
   });
});

// Verifikasi email (langkah 2 register). Kalau OTP benar, user langsung login
// sehingga di sini token sudah bisa dikirim.
export const verifyEmailController = asyncHandler(async (req, res) => {
   const result = await verifyEmail(req.body);

   setRefreshTokenCookie(res, result.refreshToken);

   return res.status(200).json({
      message: "Email berhasil diverifikasi",
      data: {
         accessToken: result.accessToken,
         user: result.user,
      },
   });
});

// Kirim ulang OTP. Pesannya sengaja dibuat samar ("jika email terdaftar")
// supaya tidak bisa dipakai menebak email mana yang punya akun.
export const resendOtpController = asyncHandler(async (req, res) => {
   await resendOtp(req.body);

   return res.status(200).json({
      message: "Jika email terdaftar, kode OTP baru sudah dikirim",
   });
});

// =========================
// LUPA PASSWORD
// =========================

// Langkah 1: kirim OTP reset password (pesan samar, alasan sama seperti di atas).
export const forgotPasswordController = asyncHandler(async (req, res) => {
   await forgotPassword(req.body.email);

   return res.status(200).json({
      message:
         "Jika email terdaftar, kode OTP untuk reset password sudah dikirim",
   });
});

// Langkah 2: cek OTP sebelum user diarahkan ke form password baru.
// OTP belum dihapus di sini karena masih dipakai di langkah 3.
export const verifyResetOtpController = asyncHandler(async (req, res) => {
   await verifyResetOtp(req.body);

   return res.status(200).json({
      message: "Kode OTP valid",
   });
});

// Langkah 3: simpan password baru. Semua sesi lama dicabut oleh service,
// jadi user memang harus login ulang.
export const resetPasswordController = asyncHandler(async (req, res) => {
   await resetPassword(req.body);

   return res.status(200).json({
      message: "Password berhasil direset, silakan login kembali",
   });
});

// =========================
// SESI (login, refresh, logout)
// =========================

export const loginController = asyncHandler(async (req, res) => {
   const result = await login(req.body);

   setRefreshTokenCookie(res, result.refreshToken);

   return res.status(200).json({
      message: "Login successful",
      data: { accessToken: result.accessToken, user: result.user },
   });
});

// Tukar refresh token (dari cookie) dengan access token baru.
// Refresh token lama dibuang dan diganti yang baru (rotasi token).
export const refreshTokenController = asyncHandler(async (req, res) => {
   const refreshTokenInput = req.cookies?.refreshToken;
   const result = await refreshToken(refreshTokenInput);

   setRefreshTokenCookie(res, result.refreshToken);

   return res.status(200).json({
      message: "Token refreshed successfully",
      data: { accessToken: result.accessToken },
   });
});

// Data user yang sedang login. `req.user` diisi oleh authMiddleware.
export const getMeController = asyncHandler(async (req, res) => {
   const user = await getMe(req.user.userId);

   return res.status(200).json({
      message: "User berhasil diambil",
      data: { user },
   });
});

// Logout 1 device: hapus refresh token di DB + kosongkan cookie-nya.
export const logoutController = asyncHandler(async (req, res) => {
   const refreshTokenInput = req.cookies?.refreshToken;

   await logout(refreshTokenInput);
   clearRefreshTokenCookie(res);

   return res.status(200).json({ message: "Logout successful" });
});
