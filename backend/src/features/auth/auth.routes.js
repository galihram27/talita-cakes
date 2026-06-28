import { Router } from "express";
import {
   registerController,
   loginController,
   refreshTokenController,
   logoutController,
} from "./auth.controller.js";
import { validate } from "../../middlewares/validate.js";
import { registerSchema, loginSchema } from "./auth.validation.js";

const router = Router();

// POST /auth/register
router.post("/register", validate(registerSchema), registerController);

// POST /auth/login
router.post("/login", validate(loginSchema), loginController);

// POST /auth/refresh-token
router.post("/refresh-token", refreshTokenController);

// POST /auth/logout
router.post("/logout", logoutController);

export default router;