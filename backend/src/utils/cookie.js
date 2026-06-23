// Helper untuk set & clear refresh token cookie.
// Dipusatkan di sini biar opsi cookie (httpOnly, secure, sameSite) konsisten
// di semua tempat yang butuh (login, register, refresh, logout).

const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
const REFRESH_TOKEN_PATH = "/api/auth/refresh-token"; //? sesuaikan dengan prefix route auth kamu kalau berbeda
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 hari, samakan dengan expiresAt di auth.service.js

export const setRefreshTokenCookie = (res, token) => {
   res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
      httpOnly: true, // gak bisa diakses lewat JS (mitigasi XSS)
      secure: process.env.NODE_ENV === "production", // cuma kirim lewat HTTPS di production
      sameSite: "strict", // mitigasi CSRF
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: REFRESH_TOKEN_PATH, // cookie cuma dikirim ke endpoint refresh-token
   });
};

export const clearRefreshTokenCookie = (res) => {
   res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: REFRESH_TOKEN_PATH,
   });
};

export { REFRESH_TOKEN_COOKIE_NAME };