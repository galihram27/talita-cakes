import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cacheGet, cacheSet, cacheDeleteByPrefix, cached } from "./cache.js";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

describe("cache", () => {
   beforeEach(() => {
      vi.useFakeTimers();
      // Isi cache bertahan antar test karena satu modul; kosongkan dulu.
      cacheDeleteByPrefix("");
   });

   afterEach(() => {
      vi.useRealTimers();
   });

   it("undefined untuk kunci yang belum pernah disimpan", () => {
      expect(cacheGet("product:list")).toBeUndefined();
   });

   it("mengembalikan nilai yang disimpan", () => {
      cacheSet("product:list", [{ id: 1 }]);
      expect(cacheGet("product:list")).toEqual([{ id: 1 }]);
   });

   it("menyimpan nilai falsy seperti 0, null, dan teks kosong", () => {
      cacheSet("a", 0);
      cacheSet("b", null);
      cacheSet("c", "");
      expect(cacheGet("a")).toBe(0);
      expect(cacheGet("b")).toBeNull();
      expect(cacheGet("c")).toBe("");
   });

   it("bawaannya kedaluwarsa setelah 5 menit", () => {
      cacheSet("product:list", "isi");
      vi.advanceTimersByTime(FIVE_MINUTES_MS - 1);
      expect(cacheGet("product:list")).toBe("isi");
      vi.advanceTimersByTime(1);
      expect(cacheGet("product:list")).toBeUndefined();
   });

   it("mengikuti masa berlaku yang diberikan", () => {
      cacheSet("review:google", "isi", 1000);
      vi.advanceTimersByTime(999);
      expect(cacheGet("review:google")).toBe("isi");
      vi.advanceTimersByTime(1);
      expect(cacheGet("review:google")).toBeUndefined();
   });

   it("menghapus semua kunci berawalan tertentu saja", () => {
      cacheSet("product:list", 1);
      cacheSet("product:detail:9", 2);
      cacheSet("gallery:list", 3);

      cacheDeleteByPrefix("product:");

      expect(cacheGet("product:list")).toBeUndefined();
      expect(cacheGet("product:detail:9")).toBeUndefined();
      expect(cacheGet("gallery:list")).toBe(3);
   });

   describe("cached", () => {
      it("memanggil loader sekali lalu memakai isi cache", async () => {
         const loader = vi.fn().mockResolvedValue(["produk"]);

         await expect(cached("product:list", loader)).resolves.toEqual([
            "produk",
         ]);
         await expect(cached("product:list", loader)).resolves.toEqual([
            "produk",
         ]);

         expect(loader).toHaveBeenCalledTimes(1);
      });

      it("memanggil loader lagi setelah kedaluwarsa", async () => {
         const loader = vi.fn().mockResolvedValue("isi");

         await cached("gallery:list", loader, 1000);
         vi.advanceTimersByTime(1000);
         await cached("gallery:list", loader, 1000);

         expect(loader).toHaveBeenCalledTimes(2);
      });

      it("tidak menyimpan apa pun kalau loader gagal", async () => {
         const loader = vi.fn().mockRejectedValue(new Error("DB mati"));

         await expect(cached("product:list", loader)).rejects.toThrow(
            "DB mati"
         );
         expect(cacheGet("product:list")).toBeUndefined();
      });
   });
});
