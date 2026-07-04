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

const router = Router();

router.post("/register", validate(registerSchema), registerController);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmailController);
router.post("/resend-otp", validate(resendOtpSchema), resendOtpController);

router.post("/login", validate(loginSchema), loginController);

router.post("/forgot-password", validate(forgotPasswordSchema), forgotPasswordController);
router.post("/verify-reset-otp", validate(verifyResetOtpSchema), verifyResetOtpController);
router.post("/reset-password", validate(resetPasswordSchema), resetPasswordController);

router.post("/refresh-token", refreshTokenController);
router.post("/logout", logoutController);
router.get("/me", authMiddleware, getMeController);

export default router;