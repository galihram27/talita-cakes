import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { loadApp, tokenFor, bearer } from "../../test-helpers/api.js";

let app;

beforeAll(async () => {
   app = await loadApp();
});

describe("PUT /api/settings/:key: hanya admin", () => {
   it("tanpa token dijawab 401", async () => {
      const res = await request(app)
         .put("/api/settings/hero")
         .send({ value: "x" });

      expect(res.status).toBe(401);
   });

   it("dengan akun pembeli dijawab 403", async () => {
      const res = await request(app)
         .put("/api/settings/hero")
         .set("Authorization", bearer(tokenFor("USER")))
         .send({ value: "x" });

      expect(res.status).toBe(403);
   });
});
