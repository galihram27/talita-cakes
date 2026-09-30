import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { loadApp, tokenFor, bearer } from "../../test-helpers/api.js";

let app;
const PRODUCT_ID = "0b8f6c1e-1234-4abc-9def-1234567890ab";

beforeAll(async () => {
   app = await loadApp();
});

const ADMIN_ROUTES = [
   ["post", "/api/products"],
   ["patch", `/api/products/${PRODUCT_ID}`],
   ["delete", `/api/products/${PRODUCT_ID}`],
];

describe("/api/products: hanya admin yang boleh mengubah katalog", () => {
   it.each(ADMIN_ROUTES)("%s %s tanpa token dijawab 401", async (m, url) => {
      const res = await request(app)[m](url).send({});

      expect(res.status).toBe(401);
   });

   it.each(ADMIN_ROUTES)(
      "%s %s dengan akun pembeli dijawab 403",
      async (m, url) => {
         const res = await request(app)
            [m](url)
            .set("Authorization", bearer(tokenFor("USER")))
            .send({});

         expect(res.status).toBe(403);
         expect(res.body.message).toBe(
            "Akses ditolak: hanya admin yang diizinkan"
         );
      }
   );

   // Memastikan penjaga admin tidak diam-diam menolak semua orang: admin
   // lolos sampai ke validasi, lalu ditolak karena body-nya kosong.
   it("admin dengan body kosong lolos penjaga lalu ditolak validasi (422)", async () => {
      const res = await request(app)
         .post("/api/products")
         .set("Authorization", bearer(tokenFor("ADMIN")))
         .send({});

      expect(res.status).toBe(422);
   });
});

describe("/api/products: validasi id", () => {
   it.each([
      ["get", "/api/products/bukan-uuid", "USER"],
      ["patch", "/api/products/bukan-uuid", "ADMIN"],
      ["delete", "/api/products/bukan-uuid", "ADMIN"],
   ])("%s %s dijawab 422", async (m, url, role) => {
      const res = await request(app)
         [m](url)
         .set("Authorization", bearer(tokenFor(role)));

      expect(res.status).toBe(422);
      expect(res.body.details.fieldErrors.id).toEqual([
         "Format id tidak valid",
      ]);
   });

   it("pencarian tanpa kata kunci dijawab 400", async () => {
      const res = await request(app).get("/api/products/search?keyword=%20");

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Keyword pencarian wajib diisi");
   });
});
