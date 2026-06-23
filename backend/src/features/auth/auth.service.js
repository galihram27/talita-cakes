import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AppError from "../../utils/appError.js";
import { ROLE } from "./auth.role.js";
import {
   generateAccessToken,
   generateRefreshToken,
} from "../../utils/token.js";
import {
   getUserByEmail,
   createUser,
   findRefreshTokensByUserId,
   createRefreshToken,
   deleteRefreshToken,
} from "./auth.repository.js";

// REGISTER
export const register = async (data) => {
   const { name, email, password, phone, role } = data;

   // cek user sudah ada atau belum
   const existingUser = await getUserByEmail(email);
   if (existingUser) {
      throw new AppError("Email already registered", 400);
   }

   // Ketika register, role user otomatis jadi USER (bukan ADMIN), biar gak bisa bikin akun admin sembarangan.
   const finalRole = ROLE.USER;

   // hash password
   const hashedPassword = await bcrypt.hash(password, 10);

   // create user
   const user = await createUser({
      name,
      email,
      password: hashedPassword,
      phone,
      role: finalRole,
   });

   // Auto Login (generate token)
   const accessToken = generateAccessToken(user);
   const refreshToken = generateRefreshToken(user);

   const hashedToken = await bcrypt.hash(refreshToken, 10);

   await createRefreshToken({
      token: hashedToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
   });

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

// LOGIN
export const login = async (data) => {
   const { email, password } = data;

   // cek user
   const user = await getUserByEmail(email);
   if (!user) {
      throw new AppError("Invalid email or password", 401);
   }

   // cek password
   const isPasswordValid = await bcrypt.compare(password, user.password);
   if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401);
   }

   // Validasi Role dari DB (anti data corrupt)
   if (!Object.values(ROLE).includes(user.role)) {
      throw new AppError("User role is invalid in database", 500);
   }

   // generate token
   const accessToken = generateAccessToken(user);
   const refreshToken = generateRefreshToken(user);

   const hashedToken = await bcrypt.hash(refreshToken, 10);

   await createRefreshToken({
      token: hashedToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
   });

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

// REFRESH TOKEN
export const refreshToken = async (refreshTokenInput) => {
   if (!refreshTokenInput) {
      throw new AppError("Refresh token required", 401);
   }

   // verify JWT refresh token
   let payload;
   try {
      payload = jwt.verify(refreshTokenInput, process.env.JWT_REFRESH_SECRET);
   } catch (err) {
      throw new AppError("Invalid or expired refresh token", 401);
   }

   // cek token di DB
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

   // ambil user dari relasi
   const user = storedToken.user;

   // 🔁 ROTATION: hapus token lama (hanya token sesi ini, sesi/device lain tetap aman)
   await deleteRefreshToken(storedToken.id);

   // generate token baru
   const newRefreshToken = generateRefreshToken(user);
   const hashedToken = await bcrypt.hash(newRefreshToken, 10);

   // simpan ke DB
   await createRefreshToken({
      token: hashedToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 hari
   });

   // generate access token baru
   const newAccessToken = generateAccessToken(user);

   return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
   };
};

//? TAMBAHAN: fungsi logout — diperlukan untuk menghapus refresh token tertentu
//? dari DB saat user logout, supaya cookie yang di-clear di sisi client juga
//? gak bisa dipakai lagi kalau ada yang berhasil mencurinya sebelumnya.
// LOGOUT
export const logout = async (refreshTokenInput) => {
   if (!refreshTokenInput) {
      return; // gak ada token, anggap aja sudah logout
   }

   let payload;
   try {
      payload = jwt.verify(refreshTokenInput, process.env.JWT_REFRESH_SECRET);
   } catch (err) {
      return; // token invalid/expired, gak perlu diapa-apain di DB
   }

   const userTokens = await findRefreshTokensByUserId(payload.userId);

   for (const t of userTokens) {
      const match = await bcrypt.compare(refreshTokenInput, t.token);
      if (match) {
         await deleteRefreshToken(t.id); // hapus cuma sesi ini, device lain tetap login
         break;
      }
   }
};