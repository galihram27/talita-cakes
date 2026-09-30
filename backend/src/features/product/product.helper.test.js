import { describe, it, expect } from "vitest";
import {
   ROUND_MIN_OPTIONS,
   SQUARE_MIN_OPTIONS,
   MAX_SIZE,
   generateSizeRange,
   isValidManualSize,
   isValidSize,
   hasRoundAndSquare,
   hasDuplicateVariant,
   validateSizeCompleteness,
   validateAllVariantsCompleteness,
} from "./product.helper.js";

const variantsOf = (shape, sizes) => sizes.map((size) => ({ shape, size }));

describe("batas ukuran", () => {
   it("bulat boleh mulai 16, 18, atau 20; kotak mulai 18 atau 20; maksimal 30", () => {
      expect(ROUND_MIN_OPTIONS).toEqual([16, 18, 20]);
      expect(SQUARE_MIN_OPTIONS).toEqual([18, 20]);
      expect(MAX_SIZE).toBe(30);
   });
});

describe("generateSizeRange", () => {
   it("naik kelipatan 2 sampai 30", () => {
      expect(generateSizeRange(18)).toEqual([18, 20, 22, 24, 26, 28, 30]);
   });

   it("mulai 16 menghasilkan 8 ukuran", () => {
      expect(generateSizeRange(16)).toEqual([16, 18, 20, 22, 24, 26, 28, 30]);
   });

   it("mulai 30 hanya 30", () => {
      expect(generateSizeRange(30)).toEqual([30]);
   });
});

describe("isValidManualSize", () => {
   it("menerima bilangan bulat positif", () => {
      expect(isValidManualSize(10)).toBe(true);
      expect(isValidManualSize(14)).toBe(true);
   });

   it("menolak 0, negatif, desimal, dan teks", () => {
      expect(isValidManualSize(0)).toBe(false);
      expect(isValidManualSize(-10)).toBe(false);
      expect(isValidManualSize(10.5)).toBe(false);
      expect(isValidManualSize("10")).toBe(false);
   });
});

describe("isValidSize", () => {
   it("bulat: genap dari 16 sampai 30", () => {
      expect(isValidSize("ROUND", 16)).toBe(true);
      expect(isValidSize("ROUND", 30)).toBe(true);
      expect(isValidSize("ROUND", 14)).toBe(false);
      expect(isValidSize("ROUND", 17)).toBe(false);
      expect(isValidSize("ROUND", 32)).toBe(false);
   });

   it("kotak: genap dari 18 sampai 30", () => {
      expect(isValidSize("SQUARE", 18)).toBe(true);
      expect(isValidSize("SQUARE", 16)).toBe(false);
   });

   it("menolak bentuk yang tidak dikenal", () => {
      expect(isValidSize("HEART", 20)).toBe(false);
   });
});

describe("hasRoundAndSquare", () => {
   it("true kalau ada kedua bentuk", () => {
      expect(
         hasRoundAndSquare([
            { shape: "ROUND", size: 16 },
            { shape: "SQUARE", size: 20 },
         ])
      ).toBe(true);
   });

   it("false kalau hanya satu bentuk", () => {
      expect(hasRoundAndSquare(variantsOf("ROUND", [16, 18]))).toBe(false);
   });
});

describe("hasDuplicateVariant", () => {
   it("false kalau semua kombinasi bentuk+ukuran berbeda", () => {
      expect(
         hasDuplicateVariant([
            { shape: "ROUND", size: 20 },
            { shape: "SQUARE", size: 20 },
         ])
      ).toBe(false);
   });

   it("true kalau bentuk+ukuran yang sama diisi dua kali", () => {
      expect(
         hasDuplicateVariant([
            { shape: "ROUND", size: 20 },
            { shape: "ROUND", size: 20 },
         ])
      ).toBe(true);
   });
});

describe("validateSizeCompleteness", () => {
   it("menerima ukuran lengkap walau urutannya acak", () => {
      expect(
         validateSizeCompleteness("ROUND", [30, 16, 20, 18, 24, 22, 28, 26])
      ).toEqual({ valid: true });
   });

   it("menerima kotak mulai 20 sampai 30", () => {
      expect(
         validateSizeCompleteness("SQUARE", [20, 22, 24, 26, 28, 30])
      ).toEqual({ valid: true });
   });

   it("menolak ukuran awal yang tidak diizinkan", () => {
      const result = validateSizeCompleteness("SQUARE", [16, 18, 20]);
      expect(result.valid).toBe(false);
      expect(result.message).toBe(
         "Size awal untuk SQUARE harus salah satu dari: 18, 20"
      );
   });

   it("menolak ukuran yang bolong di tengah", () => {
      const result = validateSizeCompleteness(
         "ROUND",
         [18, 20, 24, 26, 28, 30]
      );
      expect(result.valid).toBe(false);
      expect(result.message).toBe(
         "ROUND wajib diisi lengkap dari 18cm sampai 30cm (kelipatan 2): 18, 20, 22, 24, 26, 28, 30"
      );
   });

   it("menolak ukuran yang berhenti sebelum 30", () => {
      expect(validateSizeCompleteness("ROUND", [20, 22, 24]).valid).toBe(false);
   });

   it("menolak ukuran ganda", () => {
      expect(
         validateSizeCompleteness("SQUARE", [20, 22, 22, 24, 26, 28, 30]).valid
      ).toBe(false);
   });
});

describe("validateAllVariantsCompleteness", () => {
   // Susunan varian "Double Choco Custard Cake": bulat 16-30, kotak 20-30.
   const doubleChoco = [
      ...variantsOf("ROUND", [16, 18, 20, 22, 24, 26, 28, 30]),
      ...variantsOf("SQUARE", [20, 22, 24, 26, 28, 30]),
   ];

   it("menerima produk dengan kedua bentuk lengkap", () => {
      expect(validateAllVariantsCompleteness(doubleChoco)).toEqual({
         valid: true,
      });
   });

   it("menerima produk dengan satu bentuk saja", () => {
      expect(
         validateAllVariantsCompleteness(
            variantsOf("ROUND", [20, 22, 24, 26, 28, 30])
         )
      ).toEqual({ valid: true });
   });

   it("menolak kalau bentuk bulat tidak lengkap", () => {
      const result = validateAllVariantsCompleteness(
         doubleChoco.filter((v) => !(v.shape === "ROUND" && v.size === 24))
      );
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/^ROUND wajib diisi lengkap/);
   });

   it("menolak kalau bentuk kotak tidak lengkap", () => {
      const result = validateAllVariantsCompleteness(
         doubleChoco.filter((v) => !(v.shape === "SQUARE" && v.size === 30))
      );
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/^SQUARE wajib diisi lengkap/);
   });

   it("menerima daftar kosong", () => {
      expect(validateAllVariantsCompleteness([])).toEqual({ valid: true });
   });
});
