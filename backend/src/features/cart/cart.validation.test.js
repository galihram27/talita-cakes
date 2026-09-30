import { describe, it, expect } from "vitest";
import {
   addItemSchema,
   updateQuantitySchema,
   cartItemIdParamSchema,
} from "./cart.validation.js";

const PRODUCT_ID = "3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b";
const VARIANT_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

const messagesOf = (result) => result.error.issues.map((i) => i.message);

describe("addItemSchema", () => {
   it("menerima produk tanpa pilihan", () => {
      expect(
         addItemSchema.safeParse({ productId: PRODUCT_ID, quantity: 1 }).success
      ).toBe(true);
   });

   it("menerima produk dengan varian, rasa, dan catatan", () => {
      expect(
         addItemSchema.safeParse({
            productId: PRODUCT_ID,
            variantId: VARIANT_ID,
            flavor: "Blackforest",
            textOnCake: "Selamat Ulang Tahun",
            notes: "Lilin angka 5",
            quantity: 2,
         }).success
      ).toBe(true);
   });

   it("menerima rasa jamak goodiebag dan pilihan topping", () => {
      expect(
         addItemSchema.safeParse({
            productId: PRODUCT_ID,
            flavors: ["Nutella", "Double Cheese"],
            filling: "Choco Chips",
            toppings: ["Almond"],
            quantity: 10,
         }).success
      ).toBe(true);
   });

   it("mengubah jumlah berbentuk teks menjadi angka", () => {
      const result = addItemSchema.safeParse({
         productId: PRODUCT_ID,
         quantity: "3",
      });
      expect(result.data.quantity).toBe(3);
   });

   it("menolak jumlah 0", () => {
      const result = addItemSchema.safeParse({
         productId: PRODUCT_ID,
         quantity: 0,
      });
      expect(messagesOf(result)).toContain("quantity minimal 1");
   });

   it("menolak jumlah negatif", () => {
      expect(
         addItemSchema.safeParse({ productId: PRODUCT_ID, quantity: -2 })
            .success
      ).toBe(false);
   });

   it("menolak jumlah desimal", () => {
      expect(
         addItemSchema.safeParse({ productId: PRODUCT_ID, quantity: 1.5 })
            .success
      ).toBe(false);
   });

   it("menolak jumlah berupa teks yang bukan angka", () => {
      expect(
         addItemSchema.safeParse({ productId: PRODUCT_ID, quantity: "dua" })
            .success
      ).toBe(false);
   });

   it("menolak tanpa jumlah", () => {
      expect(addItemSchema.safeParse({ productId: PRODUCT_ID }).success).toBe(
         false
      );
   });

   it("menolak productId yang bukan UUID", () => {
      const result = addItemSchema.safeParse({ productId: "1", quantity: 1 });
      expect(messagesOf(result)).toContain("productId tidak valid");
   });

   it("menolak variantId yang bukan UUID", () => {
      const result = addItemSchema.safeParse({
         productId: PRODUCT_ID,
         variantId: "kecil",
         quantity: 1,
      });
      expect(messagesOf(result)).toContain("variantId tidak valid");
   });

   it("menolak rasa yang tidak ada di daftar mana pun", () => {
      expect(
         addItemSchema.safeParse({
            productId: PRODUCT_ID,
            flavor: "Durian",
            quantity: 1,
         }).success
      ).toBe(false);
   });

   it("menolak topping yang bukan daftar", () => {
      expect(
         addItemSchema.safeParse({
            productId: PRODUCT_ID,
            toppings: "Almond",
            quantity: 1,
         }).success
      ).toBe(false);
   });
});

describe("updateQuantitySchema", () => {
   it("menerima 0 sebagai tanda hapus", () => {
      expect(updateQuantitySchema.safeParse({ quantity: 0 }).success).toBe(
         true
      );
   });

   it("menolak jumlah negatif", () => {
      const result = updateQuantitySchema.safeParse({ quantity: -1 });
      expect(messagesOf(result)).toContain("quantity tidak boleh negatif");
   });

   it("menolak jumlah desimal", () => {
      expect(updateQuantitySchema.safeParse({ quantity: 2.5 }).success).toBe(
         false
      );
   });
});

describe("cartItemIdParamSchema", () => {
   it("menolak itemId yang bukan UUID", () => {
      const result = cartItemIdParamSchema.safeParse({ itemId: "1" });
      expect(messagesOf(result)).toContain("itemId tidak valid");
   });
});
