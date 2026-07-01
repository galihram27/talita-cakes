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
} from "../../utils/otp.js";
import { sendOtpEmail } from "../../utils/email.js";
import {
   getUserByEmail,
   createUser,
   findRefreshTokensByUserId,
   createRefreshToken,
   deleteRefreshToken,
   deleteAllRefreshTokensByUserId,
   createOtpCode,
   findLatestOtpByUserAndPurpose,
   deleteOtpById,
   deleteOtpsByUserAndPurpose,
   markUserVerified,
   updateUserPassword,
} from "./auth.repository.js";
import { CURRENT_TERMS_VERSION } from "../../config/legal.config.js";

const OTP_PURPOSE = {
   EMAIL_VERIFICATION: "EMAIL_VERIFICATION",
   PASSWORD_RESET: "PASSWORD_RESET",
};

// Generate OTP baru, simpan (hash) ke DB, lalu kirim email.
// Dipakai bareng oleh register, resendOtp, dan forgotPassword.
const issueOtp = async (user, purpose) => {
   const code = generateOtpCode();
   if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV OTP] ${purpose} untuk ${user.email}: ${code}`);
   }
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

const issueAuthTokens = async (user) => {
   const accessToken = generateAccessToken(user);
   const refreshToken = generateRefreshToken(user);
   const hashedToken = await bcrypt.hash(refreshToken, 10);

   await createRefreshToken({
      token: hashedToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
   });

   return { accessToken, refreshToken };
};

// REGISTER
export const register = async (data) => {
   const { name, email, password, phone, acceptedTerms } = data;

   const existingUser = await getUserByEmail(email);
   if (existingUser) {
      throw new AppError("Email already registered", 400);
   }

   // acceptedTerms sudah pasti true di titik ini (divalidasi Zod),
   // tapi tetap defensive check biar service ini aman dipanggil dari mana pun.
   if (!acceptedTerms) {
      throw new AppError("Anda harus menyetujui Terms of Use & Privacy Policy", 422);
   }

   const hashedPassword = await bcrypt.hash(password, 10);

   const user = await createUser({
      name,
      email,
      password: hashedPassword,
      phone,
      role: ROLE.USER,
      termsAcceptedAt: new Date(),
      termsVersion: CURRENT_TERMS_VERSION,
   });

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

// LOGIN
export const login = async (data) => {
   const { email, password } = data;

   const user = await getUserByEmail(email);
   if (!user) {
      throw new AppError("Invalid email or password", 401);
   }

   const isPasswordValid = await bcrypt.compare(password, user.password);
   if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401);
   }

   if (!user.isVerified) {
      throw new AppError("Email belum diverifikasi. Silakan cek email kamu.", 403);
   }

   if (!Object.values(ROLE).includes(user.role)) {
      throw new AppError("User role is invalid in database", 500);
   }

   const { accessToken, refreshToken } = await issueAuthTokens(user);

   return {
      accessToken,
      refreshToken,
      user: {
         id: user.id,
         name: user.name,
         email: user.email,
         role: user.role,
      },
   };
};

// VERIFY EMAIL (register step 2)
export const verifyEmail = async ({ email, code }) => {
   const user = await getUserByEmail(email);
   if (!user) {
      throw new AppError("User tidak ditemukan", 404);
   }

   if (user.isVerified) {
      throw new AppError("Email sudah terverifikasi", 400);
   }

   const otp = await findLatestOtpByUserAndPurpose(user.id, OTP_PURPOSE.EMAIL_VERIFICATION);
   if (!otp) {
      throw new AppError("Kode OTP tidak ditemukan, silakan minta kode baru", 400);
   }

   if (otp.expiresAt < new Date()) {
      await deleteOtpById(otp.id);
      throw new AppError("Kode OTP sudah kedaluwarsa, silakan minta kode baru", 400);
   }

   const isMatch = await compareOtpCode(code, otp.code);
   if (!isMatch) {
      throw new AppError("Kode OTP salah", 400);
   }

   await markUserVerified(user.id);
   await deleteOtpById(otp.id);

   // Auto-login begitu verifikasi sukses
   const { accessToken, refreshToken } = await issueAuthTokens(user);

   return {
      accessToken,
      refreshToken,
      user: {
         id: user.id,
         name: user.name,
         email: user.email,
         role: user.role,
      },
   };
};

// RESEND OTP (dipakai untuk EMAIL_VERIFICATION maupun PASSWORD_RESET)
export const resendOtp = async ({ email, purpose }) => {
   const user = await getUserByEmail(email);
   if (!user) return; // diam-diam, jangan bocorin email terdaftar atau tidak

   if (purpose === OTP_PURPOSE.EMAIL_VERIFICATION && user.isVerified) {
      throw new AppError("Email sudah terverifikasi", 400);
   }

   const existingOtp = await findLatestOtpByUserAndPurpose(user.id, purpose);
   if (existingOtp) {
      const secondsSinceCreated = (Date.now() - existingOtp.createdAt.getTime()) / 1000;
      if (secondsSinceCreated < OTP_RESEND_COOLDOWN_SECONDS) {
         const waitSeconds = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceCreated);
         throw new AppError(`Tunggu ${waitSeconds} detik sebelum meminta kode baru`, 429);
      }
   }

   await issueOtp(user, purpose);
};

// FORGOT PASSWORD (step 1: kirim OTP)
export const forgotPassword = async (email) => {
   const user = await getUserByEmail(email);
   if (!user) return; // jangan bocorin user terdaftar atau tidak

   const existingOtp = await findLatestOtpByUserAndPurpose(user.id, OTP_PURPOSE.PASSWORD_RESET);
   if (existingOtp) {
      const secondsSinceCreated = (Date.now() - existingOtp.createdAt.getTime()) / 1000;
      if (secondsSinceCreated < OTP_RESEND_COOLDOWN_SECONDS) return; // skip diam-diam
   }

   await issueOtp(user, OTP_PURPOSE.PASSWORD_RESET);
};

// RESET PASSWORD (step 2: verifikasi OTP + set password baru)
export const resetPassword = async ({ email, code, newPassword }) => {
   const user = await getUserByEmail(email);
   if (!user) {
      throw new AppError("Kode OTP tidak valid", 400);
   }

   const otp = await findLatestOtpByUserAndPurpose(user.id, OTP_PURPOSE.PASSWORD_RESET);
   if (!otp) {
      throw new AppError("Kode OTP tidak ditemukan, silakan minta kode baru", 400);
   }

   if (otp.expiresAt < new Date()) {
      await deleteOtpById(otp.id);
      throw new AppError("Kode OTP sudah kedaluwarsa, silakan minta kode baru", 400);
   }

   const isMatch = await compareOtpCode(code, otp.code);
   if (!isMatch) {
      throw new AppError("Kode OTP salah", 400);
   }

   const hashedPassword = await bcrypt.hash(newPassword, 10);
   await updateUserPassword(user.id, hashedPassword);
   await deleteOtpById(otp.id);

   // Paksa logout semua device demi keamanan setelah password diganti
   await deleteAllRefreshTokensByUserId(user.id);
};

// REFRESH TOKEN & LOGOUT — sama seperti sebelumnya, tidak berubah
export const refreshToken = async (refreshTokenInput) => {
   if (!refreshTokenInput) {
      throw new AppError("Refresh token required", 401);
   }

   let payload;
   try {
      payload = jwt.verify(refreshTokenInput, process.env.JWT_REFRESH_SECRET);
   } catch (err) {
      throw new AppError("Invalid or expired refresh token", 401);
   }

   const userTokens = await findRefreshTokensByUserId(payload.userId);
   if (!userTokens || userTokens.length === 0) {
      throw new AppError("Refresh token not found", 401);
   }

   let storedToken = null;
   for (const t of userTokens) {
      const match = await bcrypt.compare(refreshTokenInput, t.token);
      if (match) {
         storedToken = t;
         break;
      }
   }

   if (!storedToken) {
      throw new AppError("Invalid refresh token", 401);
   }

   const user = storedToken.user;

   await deleteRefreshToken(storedToken.id);

   const newRefreshToken = generateRefreshToken(user);
   const hashedToken = await bcrypt.hash(newRefreshToken, 10);

   await createRefreshToken({
      token: hashedToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
   });

   const newAccessToken = generateAccessToken(user);

   return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
   };
};

export const logout = async (refreshTokenInput) => {
   if (!refreshTokenInput) return;

   let payload;
   try {
      payload = jwt.verify(refreshTokenInput, process.env.JWT_REFRESH_SECRET);
   } catch (err) {
      return;
   }

   const userTokens = await findRefreshTokensByUserId(payload.userId);

   for (const t of userTokens) {
      const match = await bcrypt.compare(refreshTokenInput, t.token);
      if (match) {
         await deleteRefreshToken(t.id);
         break;
      }
   }
};