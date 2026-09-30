import { describe, it, expect } from "vitest";
import { applyDiscount } from "./cart.service.js";

describe("applyDiscount", () => {
   it("mengembalikan harga dasar kalau diskon 0", () => {
      expect(applyDiscount(100000, 0)).toBe(100000);
   });
});
