import { vi } from "vitest";
import jwt from "jsonwebtoken";

/**
 * Pembantu untuk API test (`*.api.test.js`): memuat aplikasi Express yang
 * sebenarnya dan membuat token login palsu.
 *
 * Basis data tetap ditiru oleh vitest.setup.js. Karena itu API test hanya
 * cocok untuk request yang ditolak SEBELUM menyentuh basis data (belum login,
 * bukan admin, data rusak). Kalau sebuah request ternyata sampai ke basis
 * data, jawabannya 500 dan test yang mengharapkan 401/403/422 gagal.
 */

export const JWT_SECRET = "rahasia-access-test";
export const JWT_REFRESH_SECRET = "rahasia-refresh-test";
export const FRONTEND_URL = "https://talita.test";

// Diisi sebelum app.js dimuat, karena CORS dan klien Resend membaca
// process.env saat modulnya di-import.
export const loadApp = async () => {
   vi.stubEnv("JWT_SECRET", JWT_SECRET);
   vi.stubEnv("JWT_REFRESH_SECRET", JWT_REFRESH_SECRET);
   vi.stubEnv("FRONTEND_URL", FRONTEND_URL);
   vi.stubEnv("CHAT_ENABLED", "");
   vi.stubEnv("DEPLOY_HOOK_URL", "");
   // Klien Resend menolak dibuat tanpa kunci. Pengiriman email tetap tidak
   // mungkin terjadi karena modul email ditiru di bawah.
   vi.stubEnv("RESEND_API_KEY", "re_test_tidak_dipakai");
   vi.doMock("../utils/email.js", () => ({ sendOtpEmail: vi.fn() }));

   const { default: app } = await import("../app.js");
   return app;
};

// Bentuk isi token sama dengan utils/token.js
export const tokenFor = (role, { secret = JWT_SECRET, ...options } = {}) =>
   jwt.sign({ userId: `user-${role.toLowerCase()}`, role }, secret, {
      expiresIn: "1h",
      ...options,
   });

export const bearer = (token) => `Bearer ${token}`;
