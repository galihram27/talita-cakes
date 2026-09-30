import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AppError from "../../utils/appError.js";
import { ROLE } from "./auth.role.js";
import {
   generateAccessToken,
   generateRefreshToken,
} from "../../utils/token.js";
import {
   generateOtpCode,
   hashOtpCode,
   compareOtpCode,
   OTP_EXPIRES_MINUTES,
   OTP_RESEND_COOLDOWN_SECONDS,
   OTP_MAX_ATTEMPTS,
} from "../../utils/otp.js";
import { sendOtpEmail } from "../../utils/email.js";
import {
   getUserByEmail,
   createUser,
   updateUser,
   getUserById,
   findRefreshTokensByUserId,
   createRefreshToken,
   deleteRefreshToken,
   deleteAllRefreshTokensByUserId,
   createOtpCode,
   findLatestOtpByUserAndPurpose,
   consumeOtpAttempt,
   releaseOtpAttempt,
   deleteOtpById,
   deleteOtpsByUserAndPurpose,
   markUserVerified,
   updateUserPassword,
   deleteUnverifiedUsersOlderThan,
} from "./auth.repository.js";
import { CURRENT_TERMS_VERSION } from "../../config/legal.config.js";

/**
 * Lapisan service: semua aturan bisnis auth ada di sini.
 *
 * Alur besarnya ada tiga:
 * 1. Register  -> daftar, terima OTP di email, verifikasi, langsung login.
 * 2. Login     -> cek password, terbitkan access token + refresh token.
 * 3. Lupa password -> minta OTP, cek OTP, ganti password (semua sesi dicabut).
 *
 * Prinsip keamanan yang dipakai konsisten di file ini:
 * - Password & refresh token & kode OTP disimpan dalam bentuk hash, tidak pernah plaintext.
 * - Pesan error tidak membocorkan apakah sebuah email terdaftar atau tidak.
 * - Ada cooldown pengiriman OTP supaya email user tidak bisa dijadikan spam.
 * - Satu kode OTP hanya boleh dicoba OTP_MAX_ATTEMPTS kali.
 */

// Keperluan OTP. Nilainya harus sama dengan enum OtpPurpose di schema.prisma.
const OTP_PURPOSE = {
   EMAIL_VERIFICATION: "EMAIL_VERIFICATION",
   PASSWORD_RESET: "PASSWORD_RESET",
};

// Umur refresh token: 7 hari (harus sinkron dengan masa berlaku cookie-nya)
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Akun yang tidak pernah diverifikasi dianggap sampah setelah 24 jam
const UNVERIFIED_ACCOUNT_TTL_HOURS = 24;

// =========================
// HELPER INTERNAL
// =========================

// Generate OTP baru, simpan bentuk hash-nya ke DB, lalu kirim kode aslinya
// via email. Dipakai bareng oleh register, login, resendOtp, dan forgotPassword.
const issueOtp = async (user, purpose) => {
   const code = generateOtpCode();
   const hashedCode = await hashOtpCode(code);

   await deleteOtpsByUserAndPurpose(user.id, purpose); // biar cuma 1 OTP aktif per purpose
   await createOtpCode({
      userId: user.id,
      code: hashedCode,
      purpose,
      expiresAt: new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000),
   });

   await sendOtpEmail({ to: user.email, name: user.name, code, purpose });
};

// Berapa detik lagi user boleh minta OTP baru. 0 artinya boleh sekarang juga.
// Dipakai untuk menahan spam pengiriman email.
const getOtpCooldownSeconds = async (userId, purpose) => {
   const existingOtp = await findLatestOtpByUserAndPurpose(userId, purpose);
   if (!existingOtp) return 0;

   const secondsSinceCreated =
      (Date.now() - existingOtp.createdAt.getTime()) / 1000;
   const remaining = Math.ceil(
      OTP_RESEND_COOLDOWN_SECONDS - secondsSinceCreated
   );

   return remaining > 0 ? remaining : 0;
};

// Ambil OTP terbaru user lalu pastikan benar-benar valid: ada, belum
// kedaluwarsa, dan kodenya cocok. Kalau tidak valid langsung lempar error.
// OTP-nya dikembalikan (bukan dihapus) supaya pemanggil yang menentukan
// kapan OTP itu dianggap terpakai.
const assertValidOtp = async (userId, purpose, code) => {
   const otp = await findLatestOtpByUserAndPurpose(userId, purpose);
   if (!otp) {
      throw new AppError(
         "Kode OTP tidak ditemukan, silakan minta kode baru",
         400
      );
   }

   if (otp.expiresAt < new Date()) {
      await deleteOtpById(otp.id); // sudah tidak berguna, buang saja
      throw new AppError(
         "Kode OTP sudah kedaluwarsa, silakan minta kode baru",
         400
      );
   }

   // Satu percobaan dicatat SEBELUM kode dicocokkan, supaya tebakan yang
   // dikirim bersamaan tetap terhitung satu per satu. Kalau kodenya benar,
   // percobaan itu dikembalikan di bawah: alur lupa sandi mencocokkan kode
   // yang sama dua kali (cek kode, lalu ganti sandi) dan itu tidak boleh
   // memakan jatah.
   //
   // Kodenya tidak dihapus saat jatah habis. Kode itu tetap ditolak sampai
   // diganti kode baru, sedangkan menghapusnya bisa bentrok dengan permintaan
   // kode baru yang datang bersamaan.
   const attemptAllowed = await consumeOtpAttempt(otp.id, OTP_MAX_ATTEMPTS);
   if (!attemptAllowed) {
      throw new AppError(
         "Kode OTP sudah terlalu sering salah, silakan minta kode baru",
         400
      );
   }

   const isMatch = await compareOtpCode(code, otp.code);
   if (!isMatch) {
      throw new AppError("Kode OTP salah", 400);
   }
   await releaseOtpAttempt(otp.id);

   return otp;
};

// Terbitkan sepasang token untuk 1 sesi login.
// Access token dipakai frontend; refresh token disimpan ke DB dalam bentuk
// hash supaya kalau DB bocor pun token-nya tidak langsung bisa dipakai.
const issueAuthTokens = async (user) => {
   const accessToken = generateAccessToken(user);
   const refreshToken = generateRefreshToken(user);
   const hashedToken = await bcrypt.hash(refreshToken, 10);

   await createRefreshToken({
      token: hashedToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
   });

   return { accessToken, refreshToken };
};

// Bentuk data user yang aman dikirim ke client (tanpa password & flag internal)
const toPublicUser = (user) => ({
   id: user.id,
   name: user.name,
   email: user.email,
   phone: user.phone,
   role: user.role,
});

// =========================
// REGISTER
// =========================

// Register tidak langsung membuat sesi login. User dibuat dulu dengan status
// belum terverifikasi, lalu OTP dikirim ke emailnya.
export const register = async (data) => {
   const { name, email, password, phone, acceptedTerms } = data;

   if (!acceptedTerms) {
      throw new AppError(
         "Anda harus menyetujui Terms of Use & Privacy Policy",
         422
      );
   }

   const existingUser = await getUserByEmail(email);

   // Email sudah terverifikasi -> memang benar-benar sudah dipakai, tolak.
   if (existingUser && existingUser.isVerified) {
      throw new AppError("Email sudah terdaftar", 400);
   }

   const hashedPassword = await bcrypt.hash(password, 10);
   let user;

   if (existingUser && !existingUser.isVerified) {
      // Re-register: akun lama belum dipakai, jadi datanya boleh ditimpa.
      // Cek cooldown OTP dulu biar endpoint ini tidak dipakai spam email.
      const waitSeconds = await getOtpCooldownSeconds(
         existingUser.id,
         OTP_PURPOSE.EMAIL_VERIFICATION
      );
      if (waitSeconds > 0) {
         throw new AppError(
            `Tunggu ${waitSeconds} detik sebelum meminta kode baru`,
            429
         );
      }

      // Timpa data lama dengan data terbaru yang dikirim user
      user = await updateUser(existingUser.id, {
         name,
         email,
         password: hashedPassword,
         phone,
         termsAcceptedAt: new Date(),
         termsVersion: CURRENT_TERMS_VERSION,
      });
   } else {
      user = await createUser({
         name,
         email,
         password: hashedPassword,
         phone,
         role: ROLE.USER,
         termsAcceptedAt: new Date(),
         termsVersion: CURRENT_TERMS_VERSION,
      });
   }

   await issueOtp(user, OTP_PURPOSE.EMAIL_VERIFICATION);

   return {
      user: {
         id: user.id,
         name: user.name,
         email: user.email,
         role: user.role,
      },
   };
};

// Verifikasi email (langkah 2 register). Kalau OTP cocok, akun ditandai
// terverifikasi dan user langsung dapat sesi login.
export const verifyEmail = async ({ email, code }) => {
   const user = await getUserByEmail(email);
   if (!user) {
      throw new AppError("User tidak ditemukan", 404);
   }

   if (user.isVerified) {
      throw new AppError("Email sudah terverifikasi", 400);
   }

   const otp = await assertValidOtp(
      user.id,
      OTP_PURPOSE.EMAIL_VERIFICATION,
      code
   );

   await markUserVerified(user.id);
   await deleteOtpById(otp.id); // OTP sekali pakai

   // Auto-login begitu verifikasi sukses
   const { accessToken, refreshToken } = await issueAuthTokens(user);

   return {
      accessToken,
      refreshToken,
      user: toPublicUser(user),
   };
};

// Kirim ulang OTP, dipakai untuk EMAIL_VERIFICATION maupun PASSWORD_RESET.
export const resendOtp = async ({ email, purpose }) => {
   const user = await getUserByEmail(email);
   if (!user) return; // diam-diam, jangan bocorin email terdaftar atau tidak

   if (purpose === OTP_PURPOSE.EMAIL_VERIFICATION && user.isVerified) {
      throw new AppError("Email sudah terverifikasi", 400);
   }

   const waitSeconds = await getOtpCooldownSeconds(user.id, purpose);
   if (waitSeconds > 0) {
      throw new AppError(
         `Tunggu ${waitSeconds} detik sebelum meminta kode baru`,
         429
      );
   }

   await issueOtp(user, purpose);
};

// =========================
// LOGIN
// =========================

export const login = async (data) => {
   const { email, password } = data;

   // Email tidak ditemukan dan password salah sengaja memakai pesan yang sama,
   // supaya tidak bisa dipakai menebak email mana yang punya akun.
   const user = await getUserByEmail(email);
   if (!user) {
      throw new AppError("Invalid email or password", 401);
   }

   const isPasswordValid = await bcrypt.compare(password, user.password);
   if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401);
   }

   if (!user.isVerified) {
      // Auto-kirim ulang OTP (tetap hormati cooldown) supaya user bisa langsung
      // lanjut ke halaman verifikasi tanpa perlu klik "kirim ulang" manual.
      const waitSeconds = await getOtpCooldownSeconds(
         user.id,
         OTP_PURPOSE.EMAIL_VERIFICATION
      );
      if (waitSeconds === 0) {
         await issueOtp(user, OTP_PURPOSE.EMAIL_VERIFICATION);
      }

      // Pesan ini HANYA untuk log/debug backend. Frontend jangan tampilkan
      // err.response.data.message-nya langsung — cek details.code saja.
      throw new AppError("Email belum diverifikasi", 403, {
         code: "EMAIL_NOT_VERIFIED",
         email: user.email,
      });
   }

   // Jaga-jaga kalau nilai role di DB diubah manual jadi tidak dikenal
   if (!Object.values(ROLE).includes(user.role)) {
      throw new AppError("User role is invalid in database", 500);
   }

   const { accessToken, refreshToken } = await issueAuthTokens(user);

   return {
      accessToken,
      refreshToken,
      user: toPublicUser(user),
   };
};

// =========================
// LUPA PASSWORD (3 langkah)
// =========================

// Langkah 1: kirim OTP reset password.
// Fungsi ini tidak pernah melempar error supaya orang luar tidak bisa memakai
// endpoint ini untuk mengecek email mana yang terdaftar.
export const forgotPassword = async (email) => {
   const user = await getUserByEmail(email);
   if (!user) return;

   const waitSeconds = await getOtpCooldownSeconds(
      user.id,
      OTP_PURPOSE.PASSWORD_RESET
   );
   if (waitSeconds > 0) return; // masih cooldown, lewati diam-diam

   await issueOtp(user, OTP_PURPOSE.PASSWORD_RESET);
};

// Langkah 2: cek OTP valid TANPA menghapusnya — OTP baru dibuang setelah
// benar-benar dipakai di resetPassword.
export const verifyResetOtp = async ({ email, code }) => {
   const user = await getUserByEmail(email);
   if (!user) {
      throw new AppError("Kode OTP salah", 400); // jangan bocorin email terdaftar atau tidak
   }

   await assertValidOtp(user.id, OTP_PURPOSE.PASSWORD_RESET, code);
};

// Langkah 3: OTP dicek ulang (karena langkah 2 bisa saja dilewati), lalu
// password diganti.
export const resetPassword = async ({ email, code, newPassword }) => {
   const user = await getUserByEmail(email);
   if (!user) {
      throw new AppError("Kode OTP tidak valid", 400);
   }

   const otp = await assertValidOtp(user.id, OTP_PURPOSE.PASSWORD_RESET, code);

   const hashedPassword = await bcrypt.hash(newPassword, 10);
   await updateUserPassword(user.id, hashedPassword);
   await deleteOtpById(otp.id);

   // Paksa logout semua device demi keamanan setelah password diganti
   await deleteAllRefreshTokensByUserId(user.id);
};

// =========================
// REFRESH TOKEN & LOGOUT
// =========================

// Cari refresh token milik user yang cocok dengan token plaintext dari client.
// Token di DB berupa hash, jadi harus dibandingkan satu per satu.
const findMatchingStoredToken = async (userId, plainToken) => {
   const userTokens = await findRefreshTokensByUserId(userId);

   for (const stored of userTokens) {
      const match = await bcrypt.compare(plainToken, stored.token);
      if (match) return stored;
   }

   return null;
};

// Tukar refresh token dengan sepasang token baru (rotasi):
// token lama dihapus supaya tidak bisa dipakai dua kali.
export const refreshToken = async (refreshTokenInput) => {
   if (!refreshTokenInput) {
      throw new AppError("Refresh token required", 401);
   }

   // Cek tanda tangan & masa berlaku JWT-nya dulu, baru cek ke DB
   let payload;
   try {
      payload = jwt.verify(refreshTokenInput, process.env.JWT_REFRESH_SECRET);
   } catch (err) {
      throw new AppError("Invalid or expired refresh token", 401);
   }

   const storedToken = await findMatchingStoredToken(
      payload.userId,
      refreshTokenInput
   );
   if (!storedToken) {
      // Token valid secara JWT tapi tidak ada di DB -> sudah dipakai/dicabut
      throw new AppError("Invalid refresh token", 401);
   }

   const user = storedToken.user;

   await deleteRefreshToken(storedToken.id);
   const { accessToken, refreshToken: newRefreshToken } =
      await issueAuthTokens(user);

   return {
      accessToken,
      refreshToken: newRefreshToken,
   };
};

// Data user yang sedang login
export const getMe = async (userId) => {
   const user = await getUserById(userId);

   if (!user) {
      throw new AppError("User tidak ditemukan", 404);
   }

   return toPublicUser(user);
};

// Logout 1 device: cukup hapus refresh token milik sesi ini.
// Token yang tidak valid diabaikan diam-diam — dari sisi user, logout selalu
// dianggap berhasil.
export const logout = async (refreshTokenInput) => {
   if (!refreshTokenInput) return;

   let payload;
   try {
      payload = jwt.verify(refreshTokenInput, process.env.JWT_REFRESH_SECRET);
   } catch (err) {
      return;
   }

   const storedToken = await findMatchingStoredToken(
      payload.userId,
      refreshTokenInput
   );
   if (storedToken) {
      await deleteRefreshToken(storedToken.id);
   }
};

// =========================
// CLEAN UP
// =========================

// Hapus akun yang didaftarkan tapi tidak pernah diverifikasi lebih dari
// UNVERIFIED_ACCOUNT_TTL_HOURS jam, supaya emailnya bisa dipakai daftar lagi.
export const cleanupUnverifiedUsers = async () => {
   const cutoff = new Date(
      Date.now() - UNVERIFIED_ACCOUNT_TTL_HOURS * 60 * 60 * 1000
   );
   const { count } = await deleteUnverifiedUsersOlderThan(cutoff);

   if (count > 0) {
      console.log(
         `[cleanup] Hapus ${count} akun belum verifikasi (>${UNVERIFIED_ACCOUNT_TTL_HOURS}h)`
      );
   }

   return count;
};
