import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import { loadApp } from "../../test-helpers/api.js";
import {
   LOGIN_LIMIT,
   OTP_SEND_LIMIT,
   OTP_VERIFY_LIMIT,
} from "./auth.limiter.js";

// Login ditiru supaya bisa berhasil tanpa basis data: sandi "benar" berhasil,
// selain itu gagal 401. Dipakai untuk membuktikan login yang berhasil tidak
// ikut dihitung.
vi.mock("./auth.service.js", async (importOriginal) => {
   const { AppError } = await import("../../utils/appError.js");
   return {
      ...(await importOriginal()),
      login: vi.fn(async ({ password }) => {
         if (password !== "sandi-benar") {
            throw new AppError("Email atau password salah", 401);
         }
         return {
            accessToken: "access",
            refreshToken: "refresh",
            user: { id: "user-1" },
         };
      }),
   };
});

let app;

beforeAll(async () => {
   app = await loadApp();
});

// Hitungan pembatas disimpan di memori dan bertahan selama berkas ini
// berjalan. Tiap test memakai IP sendiri lewat X-Forwarded-For (app.js
// memasang trust proxy) supaya tidak saling memengaruhi.
let ipCounter = 0;
const nextIp = () => `198.51.100.${++ipCounter}`;

const post = (url, body, ip) =>
   request(app).post(url).set("X-Forwarded-For", ip).send(body);

const login = (password, ip) =>
   post("/api/auth/login", { email: "sari@contoh.com", password }, ip);

// Body rusak ditolak validasi (422) tanpa menyentuh basis data, tapi tetap
// terhitung karena pembatas dipasang sebelum validasi.
const BAD_BODY = {};

describe("pembatas login", () => {
   it(`menolak dengan 429 setelah ${LOGIN_LIMIT} login gagal dari IP yang sama`, async () => {
      const ip = nextIp();
      for (let i = 0; i < LOGIN_LIMIT; i++) {
         expect((await login("sandi-salah", ip)).status).toBe(401);
      }

      const res = await login("sandi-salah", ip);

      expect(res.status).toBe(429);
      expect(res.body).toMatchObject({
         success: false,
         message:
            "Terlalu banyak percobaan. Coba lagi dalam 15 menit, atau hubungi kami lewat WhatsApp.",
      });
   });

   it("setelah terkena batas, sandi yang benar pun ditolak", async () => {
      const ip = nextIp();
      for (let i = 0; i < LOGIN_LIMIT; i++) await login("sandi-salah", ip);

      expect((await login("sandi-benar", ip)).status).toBe(429);
   });

   it("login yang berhasil tidak dihitung", async () => {
      const ip = nextIp();
      for (let i = 0; i < LOGIN_LIMIT * 2; i++) {
         expect((await login("sandi-benar", ip)).status).toBe(200);
      }
      for (let i = 0; i < LOGIN_LIMIT - 1; i++) await login("sandi-salah", ip);

      expect((await login("sandi-salah", ip)).status).toBe(401);
   });

   it("IP lain tidak ikut terbatasi", async () => {
      const ip = nextIp();
      for (let i = 0; i <= LOGIN_LIMIT; i++) await login("sandi-salah", ip);

      expect((await login("sandi-salah", nextIp())).status).toBe(401);
   });

   it("mengirim header RateLimit supaya sisa jatah bisa dibaca", async () => {
      const res = await login("sandi-salah", nextIp());

      expect(res.headers["ratelimit-policy"]).toBeDefined();
      expect(res.headers.ratelimit).toMatch(/r=9/);
   });
});

describe("pembatas pengiriman OTP", () => {
   // Ketiga endpoint mengirim email, jadi berbagi satu jatah. Kalau tidak,
   // batasnya bisa diakali dengan berpindah-pindah endpoint.
   it(`daftar, kirim ulang OTP, dan lupa sandi berbagi ${OTP_SEND_LIMIT} request`, async () => {
      const ip = nextIp();
      const urls = [
         "/api/auth/register",
         "/api/auth/resend-otp",
         "/api/auth/forgot-password",
      ];
      for (let i = 0; i < OTP_SEND_LIMIT; i++) {
         const res = await post(urls[i % urls.length], BAD_BODY, ip);
         expect(res.status).toBe(422);
      }

      for (const url of urls) {
         expect((await post(url, BAD_BODY, ip)).status).toBe(429);
      }
   });

   it("login tidak memakai jatah pengiriman OTP", async () => {
      const ip = nextIp();
      for (let i = 0; i < OTP_SEND_LIMIT; i++) {
         await post("/api/auth/register", BAD_BODY, ip);
      }

      expect((await login("sandi-benar", ip)).status).toBe(200);
   });
});

describe("pembatas verifikasi OTP", () => {
   it(`verifikasi email, cek kode reset, dan ganti sandi berbagi ${OTP_VERIFY_LIMIT} request`, async () => {
      const ip = nextIp();
      const urls = [
         "/api/auth/verify-email",
         "/api/auth/verify-reset-otp",
         "/api/auth/reset-password",
      ];
      for (let i = 0; i < OTP_VERIFY_LIMIT; i++) {
         const res = await post(urls[i % urls.length], BAD_BODY, ip);
         expect(res.status).toBe(422);
      }

      for (const url of urls) {
         expect((await post(url, BAD_BODY, ip)).status).toBe(429);
      }
   });
});

describe("endpoint sesi tidak dibatasi", () => {
   // Frontend memanggil refresh-token otomatis setiap access token habis.
   // Membatasinya bisa membuat pembeli tiba-tiba keluar sendiri.
   it("refresh-token tetap dijawab 401 biasa setelah banyak request", async () => {
      const ip = nextIp();
      for (let i = 0; i < 30; i++) {
         expect((await post("/api/auth/refresh-token", {}, ip)).status).toBe(
            401
         );
      }
   });
});
