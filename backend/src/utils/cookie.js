// Helper untuk set & clear refresh token cookie.
// Dipusatkan di sini biar opsi cookie (httpOnly, secure, sameSite) konsisten
// di semua tempat yang butuh (login, register, refresh, logout).

const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
const REFRESH_TOKEN_PATH = "/api/auth/refresh-token"; //? sesuaikan dengan prefix route auth kamu kalau berbeda
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 hari, samakan dengan expiresAt di auth.service.js

const isProd = process.env.NODE_ENV === "production";

// Di production, frontend (Vercel) dan backend (Render) beda domain, jadi cookie
// harus sameSite: "none" + secure: true supaya browser mau mengirim cookie lintas
// domain. Di development (localhost) tetap "strict" untuk mitigasi CSRF.
const CROSS_SITE_COOKIE = {
   httpOnly: true, // gak bisa diakses lewat JS (mitigasi XSS)
   secure: isProd, // cuma kirim lewat HTTPS di production
   sameSite: isProd ? "none" : "strict",
   path: REFRESH_TOKEN_PATH, // cookie cuma dikirim ke endpoint refresh-token
};

export const setRefreshTokenCookie = (res, token) => {
   res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
      ...CROSS_SITE_COOKIE,
      maxAge: REFRESH_TOKEN_MAX_AGE,
   });
};

export const clearRefreshTokenCookie = (res) => {
   res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, CROSS_SITE_COOKIE);
};

export { REFRESH_TOKEN_COOKIE_NAME };