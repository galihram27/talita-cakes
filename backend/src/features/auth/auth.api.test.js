import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import {
   loadApp,
   tokenFor,
   bearer,
   JWT_REFRESH_SECRET,
} from "../../test-helpers/api.js";

let app;

beforeAll(async () => {
   app = await loadApp();
});

describe("GET /api/auth/me: penjaga login", () => {
   it("tanpa token dijawab 401", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Token tidak ditemukan" });
   });

   it("header tanpa awalan Bearer dianggap tidak ada token", async () => {
      const res = await request(app)
         .get("/api/auth/me")
         .set("Authorization", tokenFor("USER"));

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Token tidak ditemukan" });
   });

   it("token kedaluwarsa dijawab 401", async () => {
      const expired = tokenFor("USER", { expiresIn: -10 });

      const res = await request(app)
         .get("/api/auth/me")
         .set("Authorization", bearer(expired));

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
         message: "Token tidak valid atau kedaluwarsa",
      });
   });

   // Kalau kedua secret sama, refresh token (berlaku 7 hari) bisa dipakai
   // sebagai access token (seharusnya hanya 1 jam).
   it("refresh token tidak diterima sebagai access token", async () => {
      const refresh = tokenFor("USER", { secret: JWT_REFRESH_SECRET });

      const res = await request(app)
         .get("/api/auth/me")
         .set("Authorization", bearer(refresh));

      expect(res.status).toBe(401);
   });

   it("token yang isinya diubah dijawab 401", async () => {
      const [header, , signature] = tokenFor("USER").split(".");
      const payload = Buffer.from(
         JSON.stringify({ userId: "user-user", role: "ADMIN" })
      ).toString("base64url");

      const res = await request(app)
         .get("/api/auth/me")
         .set("Authorization", bearer(`${header}.${payload}.${signature}`));

      expect(res.status).toBe(401);
   });
});

describe("validasi body auth", () => {
   it.each([
      ["/api/auth/register", {}],
      ["/api/auth/register", { name: "Sari", email: "sari@", password: "x" }],
      ["/api/auth/login", { email: "bukan-email", password: "rahasia123" }],
      ["/api/auth/login", { email: "sari@contoh.com" }],
      ["/api/auth/verify-email", { email: "sari@contoh.com", code: "123" }],
      ["/api/auth/resend-otp", {}],
      ["/api/auth/forgot-password", { email: "bukan-email" }],
      ["/api/auth/reset-password", {}],
   ])("POST %s dengan body rusak dijawab 422", async (url, body) => {
      const res = await request(app).post(url).send(body);

      expect(res.status).toBe(422);
      expect(res.body).toMatchObject({
         success: false,
         message: "Validasi gagal",
      });
   });
});

describe("POST /api/auth/refresh-token", () => {
   it("tanpa cookie dijawab 401", async () => {
      const res = await request(app).post("/api/auth/refresh-token");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Refresh token required");
   });

   it("cookie berisi token palsu dijawab 401 tanpa memeriksa basis data", async () => {
      const res = await request(app)
         .post("/api/auth/refresh-token")
         .set("Cookie", "refreshToken=bukan-jwt");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid or expired refresh token");
   });

   it("access token di cookie tidak diterima sebagai refresh token", async () => {
      const res = await request(app)
         .post("/api/auth/refresh-token")
         .set("Cookie", `refreshToken=${tokenFor("USER")}`);

      expect(res.status).toBe(401);
   });
});

describe("POST /api/auth/logout", () => {
   // Mencatat perilaku sekarang. Cookie refresh token hanya berlaku untuk
   // path /api/auth/refresh-token, jadi peramban tidak mengirimnya ke
   // /api/auth/logout dan token di basis data tidak pernah dihapus saat
   // logout. Lihat "Temuan" di RENCANA-TESTING.md.
   it("tanpa cookie tetap berhasil dan menghapus cookie di path refresh-token", async () => {
      const res = await request(app).post("/api/auth/logout");

      expect(res.status).toBe(200);
      const [cookie] = res.headers["set-cookie"];
      expect(cookie).toMatch(/^refreshToken=;/);
      expect(cookie).toContain("Path=/api/auth/refresh-token");
      expect(cookie).toContain("HttpOnly");
   });
});
