import bcrypt from "bcrypt";
import crypto from "crypto";

/**
 * Pembuatan & pencocokan kode OTP.
 *
 * Ketiga konstanta di bawah adalah aturan mainnya, dipakai bersama oleh
 * auth.service.js (masa berlaku & jeda kirim ulang) dan auth.validation.js
 * (panjang kode).
 */

export const OTP_LENGTH = 6;
export const OTP_EXPIRES_MINUTES = 10; // masa berlaku satu kode
export const OTP_RESEND_COOLDOWN_SECONDS = 60; // jeda minimal antar permintaan kode
// Batas tebakan untuk satu kode. Tanpa batas, kode 6 digit bisa ditebak
// terus-menerus selama masa berlakunya.
export const OTP_MAX_ATTEMPTS = 5;

/**
 * Bikin kode OTP acak sepanjang OTP_LENGTH digit.
 *
 * Pakai crypto.randomInt, BUKAN Math.random. Math.random tidak dirancang untuk
 * keamanan — deretan angkanya bisa ditebak kalau seseorang tahu cukup banyak
 * nilai sebelumnya. Kode ini yang menjaga verifikasi email & reset password,
 * jadi harus benar-benar tidak bisa diprediksi.
 *
 * Rentangnya dimulai dari 100000 supaya hasilnya selalu tepat 6 digit (tidak
 * ada kode berawalan 0 yang bikin panjangnya jadi kurang). Batas atas
 * randomInt bersifat eksklusif, jadi ditulis 10 ** OTP_LENGTH — bukan
 * dikurangi 1 seperti kalau memakai rentang inklusif.
 */
export const generateOtpCode = () => {
   const min = 10 ** (OTP_LENGTH - 1);
   const max = 10 ** OTP_LENGTH;
   return String(crypto.randomInt(min, max));
};

// Kode disimpan dalam bentuk hash, sama seperti password — yang tahu kode
// aslinya hanya user lewat emailnya.
export const hashOtpCode = async (code) => bcrypt.hash(code, 10);

export const compareOtpCode = async (code, hashedCode) =>
   bcrypt.compare(code, hashedCode);
