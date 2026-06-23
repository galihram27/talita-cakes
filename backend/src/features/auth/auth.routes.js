import { Router } from "express";
import {
   registerController,
   loginController,
   refreshTokenController,
   logoutController, //? tambah controller logout
} from "./auth.controller.js";

const router = Router();

// POST /auth/register
router.post("/register", registerController);

// POST /auth/login
router.post("/login", loginController);

// POST /auth/refresh-token
router.post("/refresh-token", refreshTokenController);

// POST /auth/logout
router.post("/logout", logoutController);

export default router;