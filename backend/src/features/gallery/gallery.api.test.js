import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { loadApp, tokenFor, bearer } from "../../test-helpers/api.js";

let app;
const GALLERY_ID = "0b8f6c1e-1234-4abc-9def-1234567890ab";

beforeAll(async () => {
   app = await loadApp();
});

const ADMIN_ROUTES = [
   ["post", "/api/galleries"],
   ["patch", `/api/galleries/${GALLERY_ID}`],
   ["delete", `/api/galleries/${GALLERY_ID}`],
];

describe("/api/galleries: hanya admin yang boleh mengubah galeri", () => {
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
      }
   );

   it("admin menambah foto dengan URL tidak sah dijawab 422", async () => {
      const res = await request(app)
         .post("/api/galleries")
         .set("Authorization", bearer(tokenFor("ADMIN")))
         .send({ title: "Kue ulang tahun", imageUrl: "bukan-url" });

      expect(res.status).toBe(422);
   });
});

describe("/api/galleries: daftar publik", () => {
   it("limit lebih dari 100 dijawab 422", async () => {
      const res = await request(app).get("/api/galleries?limit=101");

      expect(res.status).toBe(422);
   });
});
