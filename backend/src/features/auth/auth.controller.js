import { register, login, refreshToken, logout } from "./auth.service.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import { setRefreshTokenCookie, clearRefreshTokenCookie } from "../../utils/cookie.js";

// REGISTER CONTROLLER
export const registerController = asyncHandler(async (req, res) => {
  // validasi sudah dilakukan middleware validate(), req.body sudah bersih
  const result = await register(req.body);

  setRefreshTokenCookie(res, result.refreshToken);

  return res.status(201).json({
    message: "User registered successfully",
    data: {
      accessToken: result.accessToken,
      user: result.user,
    },
  });
});

// LOGIN CONTROLLER
export const loginController = asyncHandler(async (req, res) => {
  const result = await login(req.body);

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
  const refreshTokenInput = req.cookies?.refreshToken;

  const result = await refreshToken(refreshTokenInput);

  setRefreshTokenCookie(res, result.refreshToken);

  return res.status(200).json({
    message: "Token refreshed successfully",
    data: {
      accessToken: result.accessToken,
    },
  });
});

// LOGOUT CONTROLLER
export const logoutController = asyncHandler(async (req, res) => {
  const refreshTokenInput = req.cookies?.refreshToken;

  await logout(refreshTokenInput);

  clearRefreshTokenCookie(res);

  return res.status(200).json({
    message: "Logout successful",
  });
});