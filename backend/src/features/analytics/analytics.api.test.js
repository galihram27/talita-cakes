import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import { loadApp, tokenFor, bearer } from "../../test-helpers/api.js";

let app;

beforeAll(async () => {
   app = await loadApp();
});

const ADMIN_ROUTES = [
   "/api/analytics/dashboard",
   "/api/analytics/visitors",
   "/api/analytics/orders",
];

describe("/api/analytics: statistik hanya untuk admin", () => {
   it.each(ADMIN_ROUTES)("GET %s tanpa token dijawab 401", async (url) => {
      const res = await request(app).get(url);

      expect(res.status).toBe(401);
   });

   it.each(ADMIN_ROUTES)(
      "GET %s dengan akun pembeli dijawab 403",
      async (url) => {
         const res = await request(app)
            .get(url)
            .set("Authorization", bearer(tokenFor("USER")));

         expect(res.status).toBe(403);
      }
   );

   it("admin dengan tanggal tidak sah dijawab 422", async () => {
      const res = await request(app)
         .get("/api/analytics/dashboard?from=bukan-tanggal")
         .set("Authorization", bearer(tokenFor("ADMIN")));

      expect(res.status).toBe(422);
   });
});

describe("POST /api/analytics/visit", () => {
   it("visitorId yang bukan UUID dijawab 422, tanpa perlu login", async () => {
      const res = await request(app)
         .post("/api/analytics/visit")
         .send({ visitorId: "bukan-uuid" });

      expect(res.status).toBe(422);
   });

   it("kunjungan bot dijawab 204 tanpa dicatat", async () => {
      // Kegagalan mencatat kunjungan ditangkap controller dan tetap dijawab
      // 204, jadi status saja tidak cukup. Kalau bot ikut dicatat, basis data
      // tiruan melempar error dan controller menulisnya ke console.error.
      const log = vi.spyOn(console, "error").mockImplementation(() => {});

      const res = await request(app)
         .post("/api/analytics/visit")
         .set("User-Agent", "Googlebot/2.1 (+http://www.google.com/bot.html)")
         .send({});

      expect(res.status).toBe(204);
      expect(log).not.toHaveBeenCalled();
      log.mockRestore();
   });

   it("kunjungan peramban sungguhan memang dicatat", async () => {
      // Pasangan test di atas: membuktikan console.error memang terpanggil
      // saat pencatatan dicoba, supaya test bot tidak lolos begitu saja.
      const log = vi.spyOn(console, "error").mockImplementation(() => {});

      const res = await request(app)
         .post("/api/analytics/visit")
         .set(
            "User-Agent",
            "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36"
         )
         .send({});

      expect(res.status).toBe(204);
      expect(log).toHaveBeenCalledWith(
         "Gagal mencatat visitor log:",
         expect.any(Error)
      );
      log.mockRestore();
   });
});
