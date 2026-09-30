import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import jwt from "jsonwebtoken";
import { generateAccessToken, generateRefreshToken } from "./token.js";
import { REFRESH_TOKEN_MAX_AGE } from "./cookie.js";
import { REFRESH_TOKEN_TTL_MS } from "../features/auth/auth.service.js";

// auth.service.js ikut memuat modul email, yang membuat klien Resend saat
// di-import dan gagal tanpa kunci API.
vi.mock("./email.js", () => ({ sendOtpEmail: vi.fn() }));

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const user = { id: "user-1", role: "CUSTOMER" };

describe("token JWT", () => {
   beforeEach(() => {
      vi.stubEnv("JWT_SECRET", "rahasia-access");
      vi.stubEnv("JWT_REFRESH_SECRET", "rahasia-refresh");
   });

   afterEach(() => {
      vi.unstubAllEnvs();
   });

   it("access token berisi userId dan role", () => {
      const payload = jwt.verify(generateAccessToken(user), "rahasia-access");
      expect(payload).toMatchObject({ userId: "user-1", role: "CUSTOMER" });
   });

   it("access token berlaku 1 jam", () => {
      const { iat, exp } = jwt.decode(generateAccessToken(user));
      expect(exp - iat).toBe(60 * 60);
   });

   it("refresh token hanya berisi userId, tanpa role", () => {
      const payload = jwt.verify(generateRefreshToken(user), "rahasia-refresh");
      expect(payload.userId).toBe("user-1");
      expect(payload).not.toHaveProperty("role");
   });

   it("refresh token berlaku 7 hari", () => {
      const { iat, exp } = jwt.decode(generateRefreshToken(user));
      expect((exp - iat) * 1000).toBe(SEVEN_DAYS_MS);
   });

   it("refresh token tidak bisa dipakai sebagai access token", () => {
      expect(() =>
         jwt.verify(generateRefreshToken(user), "rahasia-access")
      ).toThrow(jwt.JsonWebTokenError);
   });

   it("access token tidak bisa dipakai sebagai refresh token", () => {
      expect(() =>
         jwt.verify(generateAccessToken(user), "rahasia-refresh")
      ).toThrow(jwt.JsonWebTokenError);
   });
});

// Tiga tempat yang menyebut masa berlaku refresh token harus sama. Kalau
// tidak, sesi bisa mati sebelum waktunya atau cookie tertinggal setelah
// tokennya tidak berlaku.
describe("masa berlaku refresh token sinkron", () => {
   it("umur cookie 7 hari", () => {
      expect(REFRESH_TOKEN_MAX_AGE).toBe(SEVEN_DAYS_MS);
   });

   it("umur token di basis data 7 hari", () => {
      expect(REFRESH_TOKEN_TTL_MS).toBe(SEVEN_DAYS_MS);
   });
});
