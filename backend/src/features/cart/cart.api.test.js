import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { loadApp, tokenFor, bearer } from "../../test-helpers/api.js";

let app;
const ITEM_ID = "0b8f6c1e-1234-4abc-9def-1234567890ab";

beforeAll(async () => {
   app = await loadApp();
});

describe("/api/carts: wajib login", () => {
   it.each([
      ["get", "/api/carts"],
      ["post", "/api/carts/items"],
      ["patch", `/api/carts/items/${ITEM_ID}`],
      ["delete", `/api/carts/items/${ITEM_ID}`],
      ["delete", "/api/carts"],
   ])("%s %s tanpa token dijawab 401", async (method, url) => {
      const res = await request(app)[method](url);

      expect(res.status).toBe(401);
   });
});

describe("/api/carts: validasi", () => {
   const auth = () => bearer(tokenFor("USER"));

   it("menambah barang tanpa productId dijawab 422", async () => {
      const res = await request(app)
         .post("/api/carts/items")
         .set("Authorization", auth())
         .send({ quantity: 1 });

      expect(res.status).toBe(422);
   });

   it.each([0, -1, 1.5, "dua"])(
      "menambah barang dengan jumlah %s dijawab 422",
      async (quantity) => {
         const res = await request(app)
            .post("/api/carts/items")
            .set("Authorization", auth())
            .send({ productId: ITEM_ID, quantity });

         expect(res.status).toBe(422);
      }
   );

   it("id barang yang bukan UUID dijawab 422", async () => {
      const res = await request(app)
         .patch("/api/carts/items/bukan-uuid")
         .set("Authorization", auth())
         .send({ quantity: 2 });

      expect(res.status).toBe(422);
      expect(res.body.details.fieldErrors.itemId).toEqual([
         "itemId tidak valid",
      ]);
   });

   it("mengubah jumlah menjadi negatif dijawab 422", async () => {
      const res = await request(app)
         .patch(`/api/carts/items/${ITEM_ID}`)
         .set("Authorization", auth())
         .send({ quantity: -1 });

      expect(res.status).toBe(422);
   });
});
