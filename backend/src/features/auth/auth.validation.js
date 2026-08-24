import { z } from "zod";

/**
 * Skema validasi request body untuk semua endpoint auth.
 *
 * Dipakai oleh middleware `validate()` di auth.routes.js. Kalau body tidak
 * sesuai skema, request langsung ditolak sebelum masuk ke controller/service —
 * jadi service boleh berasumsi datanya sudah berbentuk benar.
 */

// =========================
// FIELD DASAR (dipakai ulang di beberapa skema di bawah)
// =========================

// Nama: harus diawali huruf kapital, hanya huruf & spasi
const nameSchema = z
   .string()
   .min(1, "Name is required")
   .regex(
      /^[A-Z][a-zA-Z\s]*$/,
      "Name must start with a capital letter and contain only letters"
   );

// Email: wajib format email yang valid (ada "@" dan domain)
const emailSchema = z
   .string()
   .min(1, "Email is required")
   .email("Invalid email format");

// Password:
// - 6–20 karakter
// - harus diawali huruf
// - minimal 1 angka
const passwordSchema = z
   .string()
   .min(6, "Password must be at least 6 characters")
   .max(20, "Password must be at most 20 characters")
   .regex(/^[A-Za-z]/, "Password must start with a letter")
   .regex(/\d/, "Password must contain at least one number");

// Nomor telepon: bebas format, minimal 8 karakter
const phoneSchema = z.string().min(8, "Phone number is too short");

// Persetujuan Terms of Use & Privacy Policy: wajib true, bukan sekadar boolean
const acceptedTermsSchema = z
   .boolean({ message: "acceptedTerms wajib diisi" })
   .refine((val) => val === true, {
      message: "Kamu harus menyetujui Terms of Use & Privacy Policy",
   });

// Kode OTP: selalu 6 digit
const otpCodeSchema = z.string().length(6, "Kode OTP harus 6 digit");

// =========================
// REGISTER & LOGIN
// =========================

// POST /register — bikin akun baru (atau isi ulang akun yang belum verifikasi)
export const registerSchema = z.object({
   name: nameSchema,
   email: emailSchema,
   password: passwordSchema,
   phone: phoneSchema,
   acceptedTerms: acceptedTermsSchema,
});

// POST /login — password cukup dicek "tidak kosong", aturan kekuatan password
// tidak dipakai di sini supaya user lama tetap bisa login
export const loginSchema = z.object({
   email: emailSchema,
   password: z.string().min(1, "Password is required"),
});

// =========================
// VERIFIKASI EMAIL (OTP)
// =========================

// POST /verify-email — konfirmasi kode OTP yang dikirim saat register
export const verifyEmailSchema = z.object({
   email: emailSchema,
   code: otpCodeSchema,
});

// POST /resend-otp — kirim ulang OTP, dipakai dua alur (verifikasi & reset)
export const resendOtpSchema = z.object({
   email: emailSchema,
   purpose: z.enum(["EMAIL_VERIFICATION", "PASSWORD_RESET"]),
});

// =========================
// LUPA PASSWORD (3 langkah)
// =========================

// Langkah 1: POST /forgot-password — minta kode OTP reset password
export const forgotPasswordSchema = z.object({
   email: emailSchema,
});

// Langkah 2: POST /verify-reset-otp — cek OTP valid sebelum tampilkan form
export const verifyResetOtpSchema = z.object({
   email: emailSchema,
   code: otpCodeSchema,
});

// Langkah 3: POST /reset-password — kirim OTP + password baru sekaligus
export const resetPasswordSchema = z.object({
   email: emailSchema,
   code: otpCodeSchema,
   newPassword: passwordSchema,
});
