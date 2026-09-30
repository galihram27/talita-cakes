// Helper untuk set & clear refresh token cookie.
// Dipusatkan di sini biar opsi cookie (httpOnly, secure, sameSite) konsisten
// di semua tempat yang butuh (login, register, refresh, logout).
//
// PENTING: opsi saat menghapus cookie harus PERSIS sama dengan saat membuatnya
// (terutama `path`), kalau tidak browser menganggapnya cookie berbeda dan
// cookie lama tetap tertinggal. Itu sebabnya CROSS_SITE_COOKIE dipakai ulang
// di kedua fungsi di bawah.

const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
// Cookie harus sampai ke /refresh-token DAN /logout. Dulu path-nya
// /api/auth/refresh-token, akibatnya peramban tidak mengirim cookie ke
// /api/auth/logout dan token di basis data tidak pernah dicabut saat logout.
const REFRESH_TOKEN_PATH = "/api/auth";
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 hari, samakan dengan expiresAt di auth.service.js

// Path lama. Pembeli yang login sebelum path diganti masih menyimpan cookie
// di sini. Kalau dibiarkan, peramban mengirim dua cookie `refreshToken` ke
// /api/auth/refresh-token dan yang lama (path lebih spesifik) terbaca lebih
// dulu, padahal tokennya sudah dicabut saat rotasi, sehingga pembeli
// tiba-tiba keluar. Cookie ini berumur paling lama 7 hari, jadi penghapusan
// di bawah boleh dibuang 7 hari setelah perubahan ini dideploy.
const LEGACY_REFRESH_TOKEN_PATH = "/api/auth/refresh-token";

const isProd = process.env.NODE_ENV === "production";

// Di production, frontend (Vercel) dan backend (Render) beda domain, jadi cookie
// harus sameSite: "none" + secure: true supaya browser mau mengirim cookie lintas
// domain. Di development (localhost) tetap "strict" untuk mitigasi CSRF.
const CROSS_SITE_COOKIE = {
   httpOnly: true, // gak bisa diakses lewat JS (mitigasi XSS)
   secure: isProd, // cuma kirim lewat HTTPS di production
   sameSite: isProd ? "none" : "strict",
   path: REFRESH_TOKEN_PATH, // cookie cuma dikirim ke endpoint /api/auth/*
};

const clearLegacyCookie = (res) => {
   res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      ...CROSS_SITE_COOKIE,
      path: LEGACY_REFRESH_TOKEN_PATH,
   });
};

export const setRefreshTokenCookie = (res, token) => {
   res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
      ...CROSS_SITE_COOKIE,
      maxAge: REFRESH_TOKEN_MAX_AGE,
   });
   clearLegacyCookie(res);
};

export const clearRefreshTokenCookie = (res) => {
   res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, CROSS_SITE_COOKIE);
   clearLegacyCookie(res);
};

export { REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN_MAX_AGE };
