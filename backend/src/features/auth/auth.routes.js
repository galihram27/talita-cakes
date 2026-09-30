import { Router } from "express";
import {
   registerController,
   loginController,
   verifyEmailController,
   resendOtpController,
   forgotPasswordController,
   verifyResetOtpController,
   resetPasswordController,
   refreshTokenController,
   getMeController,
   logoutController,
} from "./auth.controller.js";
import { validate } from "../../middlewares/validate.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
   registerSchema,
   loginSchema,
   verifyEmailSchema,
   resendOtpSchema,
   forgotPasswordSchema,
   verifyResetOtpSchema,
   resetPasswordSchema,
} from "./auth.validation.js";
import {
   loginLimiter,
   otpSendLimiter,
   otpVerifyLimiter,
} from "./auth.limiter.js";

/**
 * Daftar endpoint auth (semua di-mount dengan prefix /api/auth).
 *
 * Urutan tiap route: pembatas request -> validate(skema) -> controller.
 * Pembatas dipasang sebelum validate supaya request rusak yang dikirim
 * berulang-ulang juga ikut terhitung. `validate` menolak body yang tidak
 * sesuai, jadi controller pasti menerima data yang sudah bersih.
 */
const router = Router();

// --- Register: daftar -> verifikasi OTP -> (opsional) kirim ulang OTP ---
router.post(
   "/register",
   otpSendLimiter,
   validate(registerSchema),
   registerController
);
router.post(
   "/verify-email",
   otpVerifyLimiter,
   validate(verifyEmailSchema),
   verifyEmailController
);
router.post(
   "/resend-otp",
   otpSendLimiter,
   validate(resendOtpSchema),
   resendOtpController
);

// --- Login ---
router.post("/login", loginLimiter, validate(loginSchema), loginController);

// --- Lupa password: minta OTP -> cek OTP -> ganti password ---
router.post(
   "/forgot-password",
   otpSendLimiter,
   validate(forgotPasswordSchema),
   forgotPasswordController
);
router.post(
   "/verify-reset-otp",
   otpVerifyLimiter,
   validate(verifyResetOtpSchema),
   verifyResetOtpController
);
router.post(
   "/reset-password",
   otpVerifyLimiter,
   validate(resetPasswordSchema),
   resetPasswordController
);

// --- Sesi: refresh & logout baca refresh token dari cookie, jadi tanpa skema ---
router.post("/refresh-token", refreshTokenController);
router.post("/logout", logoutController);

// --- Data user yang sedang login (butuh access token di header Authorization) ---
router.get("/me", authMiddleware, getMeController);

export default router;
