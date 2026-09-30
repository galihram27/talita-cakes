import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { loadApp, tokenFor, bearer } from "../../test-helpers/api.js";

let app;
const ORDER_ID = "0b8f6c1e-1234-4abc-9def-1234567890ab";

beforeAll(async () => {
   app = await loadApp();
});

describe("/api/orders: wajib login", () => {
   it.each([
      ["post", "/api/orders/preview"],
      ["post", "/api/orders/confirm"],
      ["get", "/api/orders"],
      ["get", `/api/orders/${ORDER_ID}`],
      ["get", "/api/orders/admin/all"],
      ["patch", `/api/orders/admin/${ORDER_ID}/status`],
   ])("%s %s tanpa token dijawab 401", async (m, url) => {
      const res = await request(app)[m](url);

      expect(res.status).toBe(401);
   });
});

describe("/api/orders/admin: hanya admin", () => {
   it.each([
      ["get", "/api/orders/admin/all"],
      ["patch", `/api/orders/admin/${ORDER_ID}/status`],
   ])("%s %s dengan akun pembeli dijawab 403", async (m, url) => {
      const res = await request(app)
         [m](url)
         .set("Authorization", bearer(tokenFor("USER")))
         .send({ status: "COMPLETED" });

      expect(res.status).toBe(403);
   });

   it("status pesanan di luar daftar dijawab 422", async () => {
      const res = await request(app)
         .patch(`/api/orders/admin/${ORDER_ID}/status`)
         .set("Authorization", bearer(tokenFor("ADMIN")))
         .send({ status: "DIKIRIM" });

      expect(res.status).toBe(422);
   });
});

describe("/api/orders: validasi", () => {
   it("id pesanan yang bukan UUID dijawab 422", async () => {
      const res = await request(app)
         .get("/api/orders/bukan-uuid")
         .set("Authorization", bearer(tokenFor("USER")));

      expect(res.status).toBe(422);
   });
});
