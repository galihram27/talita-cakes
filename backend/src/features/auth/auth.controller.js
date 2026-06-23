import { register, login, refreshToken, logout } from "./auth.service.js"; //? tambah import "logout"
import { registerSchema, loginSchema } from "./auth.validation.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { setRefreshTokenCookie, clearRefreshTokenCookie } from "../../utils/cookie.js"; //? import helper cookie

// REGISTER CONTROLLER
export const registerController = asyncHandler(async (req, res) => {
  // validate input
  const validatedData = registerSchema.parse(req.body);

  // call service
  const result = await register(validatedData);

  //? set refresh token sebagai httpOnly cookie, jangan dikirim di JSON body
  setRefreshTokenCookie(res, result.refreshToken);

  return res.status(201).json({
    message: "User registered successfully",
    data: {
      accessToken: result.accessToken, //? cuma access token yang dikirim di body, disimpan di memory frontend
      user: result.user,
    },
  });
});

// LOGIN CONTROLLER
export const loginController = asyncHandler(async (req, res) => {
  // validate input
  const validatedData = loginSchema.parse(req.body);

  // call service
  const result = await login(validatedData);

  //? set refresh token sebagai httpOnly cookie, jangan dikirim di JSON body
  setRefreshTokenCookie(res, result.refreshToken);

  return res.status(200).json({
    message: "Login successful",
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
});

// REFRESH TOKEN CONTROLLER
export const refreshTokenController = asyncHandler(async (req, res) => {
  //? baca refresh token dari cookie, bukan dari body lagi
  const refreshTokenInput = req.cookies?.refreshToken;

  // call service
  const result = await refreshToken(refreshTokenInput);

  //? rotation: refresh token baru di-set ulang ke cookie
  setRefreshTokenCookie(res, result.refreshToken);

  return res.status(200).json({
    message: "Token refreshed successfully",
    data: {
      accessToken: result.accessToken,
    },
  });
});

//? TAMBAHAN: controller logout, pasangan dari clearRefreshTokenCookie
// LOGOUT CONTROLLER
export const logoutController = asyncHandler(async (req, res) => {
  const refreshTokenInput = req.cookies?.refreshToken;

  await logout(refreshTokenInput);

  clearRefreshTokenCookie(res);

  return res.status(200).json({
    message: "Logout successful",
  });
});