import {
   register,
   login,
   verifyEmail,
   resendOtp,
   forgotPassword,
   resetPassword,
   refreshToken,
   logout,
} from "./auth.service.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { setRefreshTokenCookie, clearRefreshTokenCookie } from "../../utils/cookie.js";

// REGISTER: sekarang tidak langsung login, hanya kirim OTP
export const registerController = asyncHandler(async (req, res) => {
  const result = await register(req.body);

  return res.status(201).json({
    message: "Registrasi berhasil. Silakan cek email kamu untuk kode verifikasi.",
    data: { user: result.user },
  });
});

// VERIFY EMAIL (register step 2)
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

// RESEND OTP
export const resendOtpController = asyncHandler(async (req, res) => {
  await resendOtp(req.body);

  return res.status(200).json({
    message: "Jika email terdaftar, kode OTP baru sudah dikirim",
  });
});

// FORGOT PASSWORD
export const forgotPasswordController = asyncHandler(async (req, res) => {
  await forgotPassword(req.body.email);

  return res.status(200).json({
    message: "Jika email terdaftar, kode OTP untuk reset password sudah dikirim",
  });
});

// RESET PASSWORD
export const resetPasswordController = asyncHandler(async (req, res) => {
  await resetPassword(req.body);

  return res.status(200).json({
    message: "Password berhasil direset, silakan login kembali",
  });
});

// LOGIN
export const loginController = asyncHandler(async (req, res) => {
  const result = await login(req.body);
  setRefreshTokenCookie(res, result.refreshToken);
  return res.status(200).json({
    message: "Login successful",
    data: { accessToken: result.accessToken, user: result.user },
  });
});

// REFRESH TOKEN
export const refreshTokenController = asyncHandler(async (req, res) => {
  const refreshTokenInput = req.cookies?.refreshToken;
  const result = await refreshToken(refreshTokenInput);
  setRefreshTokenCookie(res, result.refreshToken);
  return res.status(200).json({
    message: "Token refreshed successfully",
    data: { accessToken: result.accessToken },
  });
});

// LOGOUT
export const logoutController = asyncHandler(async (req, res) => {
  const refreshTokenInput = req.cookies?.refreshToken;
  await logout(refreshTokenInput);
  clearRefreshTokenCookie(res);
  return res.status(200).json({ message: "Logout successful" });
});