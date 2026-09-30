import { describe, it, expect } from "vitest";
import {
   PRODUCT_CATEGORIES,
   TYPE5_SUBCATEGORIES,
   ALL_TYPE5_SUBCATEGORIES,
   type5SizeConfig,
   isBreadCategory,
   BREAD_SIZE_KEYS,
   breadSizeByKey,
   breadSizeForVariant,
   usesFilling,
   usesTopping,
   MAX_TOPPING_SELECT,
   isType5SizeSubcategory,
   type5HasSubcategories,
   FLAVORS_BY_TYPE,
   TYPE2_FLAVORS,
   CUSTOM_FLAVORS,
   ALL_FLAVORS,
   cupcakeFlavorsForCategory,
   cupcakeBoxesForCategory,
   isFixedFlavorCupcake,
   isGoodiebagCupcake,
   goodiebagMinQty,
   goodiebagSubcategories,
   goodiebagFlavorsForSubcategory,
   goodiebagFlavorLimit,
   isGoodiebagSubcategory,
   isMultiFlavorCupcake,
   cupcakeFlavorLimit,
} from "./product.constant.js";

const CUPCAKE_FLAVORS = [
   "Double Choco Cupcakes",
   "Choco Blueberry Cupcakes",
   "Vanilla Cheese Cupcakes",
   "Vanilla Strawberry Cupcakes",
];

describe("kategori & sub-kategori", () => {
   it("setiap tipe TYPE1 sampai TYPE6 punya daftar kategori", () => {
      expect(Object.keys(PRODUCT_CATEGORIES)).toEqual([
         "TYPE1",
         "TYPE2",
         "TYPE3",
         "TYPE4",
         "TYPE5",
         "TYPE6",
      ]);
   });

   it("TYPE5 terdiri dari Bread, Cheese Cake, dan Brownies", () => {
      expect(PRODUCT_CATEGORIES.TYPE5).toEqual([
         "Bread",
         "Cheese Cake",
         "Brownies",
      ]);
   });

   it("setiap kategori TYPE5 punya sub-kategori", () => {
      for (const category of PRODUCT_CATEGORIES.TYPE5) {
         expect(type5HasSubcategories(category)).toBe(true);
      }
   });

   it("Mozzarella Sausage Rolls adalah sub-kategori Bread, bukan kategori", () => {
      expect(TYPE5_SUBCATEGORIES.Bread).toContain("MOZZARELLA SAUSAGE ROLLS");
      expect(type5HasSubcategories("Mozzarella Sausage Rolls")).toBe(false);
   });

   it("gabungan sub-kategori TYPE5 berisi semua sub-kategori tanpa kecuali", () => {
      expect(ALL_TYPE5_SUBCATEGORIES).toEqual(
         Object.values(TYPE5_SUBCATEGORIES).flat()
      );
      expect(ALL_TYPE5_SUBCATEGORIES).toHaveLength(6);
   });
});

describe("Bread", () => {
   it("isBreadCategory hanya untuk kategori Bread", () => {
      expect(isBreadCategory("Bread")).toBe(true);
      expect(isBreadCategory("Brownies")).toBe(false);
      expect(isBreadCategory("bread")).toBe(false);
   });

   it("punya tiga ukuran bernama", () => {
      expect(BREAD_SIZE_KEYS).toEqual(["PERSONAL", "FAMILY", "SHARING"]);
   });

   it("breadSizeByKey mengembalikan dimensi tetap tiap ukuran", () => {
      expect(breadSizeByKey("PERSONAL")).toMatchObject({
         shape: "SQUARE",
         size: 22,
         sizeB: 10,
      });
      expect(breadSizeByKey("FAMILY")).toMatchObject({
         shape: "ROUND",
         size: 25,
         sizeB: null,
      });
      expect(breadSizeByKey("SHARING")).toMatchObject({
         shape: null,
         size: 9,
         sizeB: null,
      });
      expect(breadSizeByKey("JUMBO")).toBeNull();
   });

   // Tiga varian "Cinnamon Rolls With Cream Cheese Frosting" di toko.
   it("breadSizeForVariant mengenali varian dari bentuk & ukurannya", () => {
      expect(
         breadSizeForVariant({ shape: "SQUARE", size: 22, sizeB: 10 }).key
      ).toBe("PERSONAL");
      expect(
         breadSizeForVariant({ shape: "ROUND", size: 25, sizeB: null }).key
      ).toBe("FAMILY");
      expect(
         breadSizeForVariant({ shape: null, size: 9, sizeB: null }).key
      ).toBe("SHARING");
   });

   it("breadSizeForVariant menganggap kolom yang tidak ada sama dengan null", () => {
      expect(breadSizeForVariant({ size: 9 }).key).toBe("SHARING");
   });

   it("breadSizeForVariant null kalau tidak ada ukuran yang cocok", () => {
      expect(breadSizeForVariant({ shape: "SQUARE", size: 22 })).toBeNull();
   });
});

describe("filling & topping", () => {
   it("hanya dipakai CINROLLS VAN DEPOK", () => {
      expect(usesFilling("CINROLLS VAN DEPOK")).toBe(true);
      expect(usesTopping("CINROLLS VAN DEPOK")).toBe(true);
      expect(usesFilling("MOZZARELLA SAUSAGE ROLLS")).toBe(false);
      expect(usesTopping("BASQUE BURNT CHEESE CAKE")).toBe(false);
   });

   it("pembeli boleh memilih maksimal 3 topping", () => {
      expect(MAX_TOPPING_SELECT).toBe(3);
   });
});

describe("ukuran pilihan TYPE5", () => {
   it("hanya Basque yang memakai pilihan ukuran", () => {
      expect(isType5SizeSubcategory("BASQUE BURNT CHEESE CAKE")).toBe(true);
      expect(isType5SizeSubcategory("CINROLLS VAN DEPOK")).toBe(false);
      expect(isType5SizeSubcategory(undefined)).toBe(false);
   });

   it("Basque bulat 14, 16, 18, 20", () => {
      expect(type5SizeConfig("BASQUE BURNT CHEESE CAKE")).toEqual({
         shape: "ROUND",
         sizes: [14, 16, 18, 20],
      });
      expect(type5SizeConfig("SIGNATURE PREMIUM FUDGE BROWNIES")).toBeNull();
   });
});

describe("rasa", () => {
   it("TYPE2 dan TYPE4 punya daftar rasa sendiri", () => {
      expect(FLAVORS_BY_TYPE).toEqual({
         TYPE2: TYPE2_FLAVORS,
         TYPE4: CUSTOM_FLAVORS,
      });
      expect(TYPE2_FLAVORS).toContain("Vanilla Strawberry");
      expect(CUSTOM_FLAVORS).toContain("Blackforest");
   });

   it("ALL_FLAVORS berisi semua rasa tanpa duplikat", () => {
      expect(new Set(ALL_FLAVORS).size).toBe(ALL_FLAVORS.length);
      for (const flavor of [
         ...TYPE2_FLAVORS,
         ...CUSTOM_FLAVORS,
         ...CUPCAKE_FLAVORS,
         ...goodiebagFlavorsForSubcategory("Original Goodiebag"),
      ]) {
         expect(ALL_FLAVORS).toContain(flavor);
      }
   });
});

describe("cupcake (TYPE6)", () => {
   it("American Butter: rasa ditentukan admin, box 2 sampai 12", () => {
      const category = "American Butter Cupcakes";
      expect(isFixedFlavorCupcake(category)).toBe(true);
      expect(cupcakeFlavorsForCategory(category)).toEqual([]);
      expect(cupcakeBoxesForCategory(category)).toEqual([2, 4, 6, 9, 12]);
      expect(isGoodiebagCupcake(category)).toBe(false);
      expect(isMultiFlavorCupcake(category)).toBe(false);
   });

   it("Simple Decor: pembeli memilih rasa, box 4 sampai 12", () => {
      const category = "Simple Decor Cupcakes";
      expect(isFixedFlavorCupcake(category)).toBe(false);
      expect(cupcakeFlavorsForCategory(category)).toEqual(CUPCAKE_FLAVORS);
      expect(cupcakeBoxesForCategory(category)).toEqual([4, 6, 9, 12]);
   });

   it("Paper Topper: box mulai 6", () => {
      expect(cupcakeBoxesForCategory("Paper Topper Cupcakes")).toEqual([
         6, 9, 12,
      ]);
   });

   it("Custom 3D: box 4 sampai 12", () => {
      expect(cupcakeBoxesForCategory("Custom 3D Cupcakes")).toEqual([
         4, 6, 9, 12,
      ]);
   });

   it("Goodiebag: dijual per paket, minimal 10 box, rasa jamak", () => {
      const category = "Goodiebag Cupcakes";
      expect(isGoodiebagCupcake(category)).toBe(true);
      expect(goodiebagMinQty(category)).toBe(10);
      expect(cupcakeBoxesForCategory(category)).toEqual([]);
      expect(isMultiFlavorCupcake(category)).toBe(true);
      expect(cupcakeFlavorLimit(category)).toEqual({ min: 1, max: 4 });
   });

   it("kategori selain goodiebag minimal beli 1", () => {
      expect(goodiebagMinQty("Simple Decor Cupcakes")).toBe(1);
      expect(goodiebagMinQty("Kategori Tak Dikenal")).toBe(1);
   });

   it("kategori yang tidak dikenal memberi jawaban kosong", () => {
      expect(cupcakeFlavorsForCategory("Kue Lain")).toEqual([]);
      expect(cupcakeBoxesForCategory("Kue Lain")).toEqual([]);
      expect(isFixedFlavorCupcake("Kue Lain")).toBe(false);
      expect(cupcakeFlavorLimit("Kue Lain")).toEqual({ min: 1, max: 1 });
   });
});

describe("sub-kategori goodiebag", () => {
   it("ada Original dan Custom", () => {
      expect(goodiebagSubcategories()).toEqual([
         "Original Goodiebag",
         "Custom Goodiebag",
      ]);
      expect(isGoodiebagSubcategory("Original Goodiebag")).toBe(true);
      expect(isGoodiebagSubcategory("Goodiebag Cupcakes")).toBe(false);
   });

   it("Original: pilih 1 sampai 4 dari 10 rasa", () => {
      expect(goodiebagFlavorsForSubcategory("Original Goodiebag")).toHaveLength(
         10
      );
      expect(goodiebagFlavorLimit("Original Goodiebag")).toEqual({
         min: 1,
         max: 4,
      });
   });

   it("Custom: pilih tepat 1 rasa cupcake", () => {
      expect(goodiebagFlavorsForSubcategory("Custom Goodiebag")).toEqual(
         CUPCAKE_FLAVORS
      );
      expect(goodiebagFlavorLimit("Custom Goodiebag")).toEqual({
         min: 1,
         max: 1,
      });
   });

   it("sub-kategori yang tidak dikenal tidak punya rasa", () => {
      expect(goodiebagFlavorsForSubcategory("Lainnya")).toEqual([]);
      expect(goodiebagFlavorLimit("Lainnya")).toEqual({ min: 1, max: 1 });
   });
});
