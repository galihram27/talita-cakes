import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import { loadApp, FRONTEND_URL } from "./test-helpers/api.js";

let app;

beforeAll(async () => {
   app = await loadApp();
});

describe("app.js: jawaban umum", () => {
   it("alamat yang tidak ada dijawab 404 dalam bentuk JSON", async () => {
      const res = await request(app).get("/api/tidak-ada");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
         success: false,
         message: "Route /api/tidak-ada tidak ditemukan",
      });
   });

   it("body lebih dari 10 MB dijawab 413 dengan pesan yang jelas", async () => {
      const res = await request(app)
         .post("/api/auth/login")
         .set("Content-Type", "application/json")
         .send(JSON.stringify({ email: "a".repeat(11 * 1024 * 1024) }));

      expect(res.status).toBe(413);
      expect(res.body.message).toBe(
         "Ukuran data terlalu besar. Gunakan gambar yang lebih kecil."
      );
   });

   // Mencatat perilaku sekarang: statusnya sudah benar (400), tapi pesannya
   // "Internal Server Error" karena error dari body-parser bukan AppError.
   // Lihat "Temuan" di RENCANA-TESTING.md.
   it("JSON yang rusak dijawab 400", async () => {
      const log = vi.spyOn(console, "error").mockImplementation(() => {});

      const res = await request(app)
         .post("/api/auth/login")
         .set("Content-Type", "application/json")
         .send("{rusak");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
         success: false,
         message: "Internal Server Error",
      });
      log.mockRestore();
   });
});

describe("app.js: CORS", () => {
   it("mengizinkan FRONTEND_URL beserta cookie", async () => {
      const res = await request(app)
         .options("/api/products")
         .set("Origin", FRONTEND_URL)
         .set("Access-Control-Request-Method", "POST");

      expect(res.status).toBe(204);
      expect(res.headers["access-control-allow-origin"]).toBe(FRONTEND_URL);
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
   });

   it("tidak menyebut alamat situs lain sebagai asal yang diizinkan", async () => {
      const res = await request(app)
         .get("/api/chat/status")
         .set("Origin", "https://situs-lain.test");

      // Peramban menolak membaca jawaban karena asalnya tidak cocok
      expect(res.headers["access-control-allow-origin"]).toBe(FRONTEND_URL);
   });
});
