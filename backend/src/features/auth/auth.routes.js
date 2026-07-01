import { Router } from "express";
import {
   registerController,
   loginController,
   verifyEmailController,
   resendOtpController,
   forgotPasswordController,
   resetPasswordController,
   refreshTokenController,
   logoutController,
} from "./auth.controller.js";
import { validate } from "../../middlewares/validate.js";
import {
   registerSchema,
   loginSchema,
   verifyEmailSchema,
   resendOtpSchema,
   forgotPasswordSchema,
   resetPasswordSchema,
} from "./auth.validation.js";

const router = Router();

router.post("/register", validate(registerSchema), registerController);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmailController);
router.post("/resend-otp", validate(resendOtpSchema), resendOtpController);

router.post("/login", validate(loginSchema), loginController);

router.post("/forgot-password", validate(forgotPasswordSchema), forgotPasswordController);
router.post("/reset-password", validate(resetPasswordSchema), resetPasswordController);

router.post("/refresh-token", refreshTokenController);
router.post("/logout", logoutController);

export default router;