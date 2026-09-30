import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
   calculateDeliveryFee,
   isRequestCakeDateValid,
   MIN_DAYS_BEFORE_CAKE_DATE,
   MAX_DELIVERY_DISTANCE_KM,
} from "./order.helper.js";

describe("calculateDeliveryFee", () => {
   it("gratis untuk jarak 0", () => {
      expect(calculateDeliveryFee(0)).toBe(0);
   });

   it("gratis untuk jarak kosong atau negatif", () => {
      expect(calculateDeliveryFee(null)).toBe(0);
      expect(calculateDeliveryFee(undefined)).toBe(0);
      expect(calculateDeliveryFee(-3)).toBe(0);
   });

   it("Rp35.000 untuk jarak di bawah 2 km", () => {
      expect(calculateDeliveryFee(0.1)).toBe(35000);
      expect(calculateDeliveryFee(1.9)).toBe(35000);
   });

   it("Rp45.000 mulai tepat 2 km sampai tepat 5 km", () => {
      expect(calculateDeliveryFee(2)).toBe(45000);
      expect(calculateDeliveryFee(3)).toBe(45000);
      expect(calculateDeliveryFee(5)).toBe(45000);
   });

   // Tabel toko ditulis dengan angka bulat ("< 2 km", "3 - 5 km", ...), jadi
   // ada celah di antara baris. Jarak di celah masuk tarif berikutnya.
   it.each([
      [2.5, 45000],
      [5.5, 55000],
      [10.5, 65000],
      [15.5, 75000],
      [20.5, 85000],
   ])(
      "jarak di celah antar baris, %s km, masuk tarif berikutnya",
      (km, fee) => {
         expect(calculateDeliveryFee(km)).toBe(fee);
      }
   );

   it("Rp55.000 untuk di atas 5 sampai tepat 10 km", () => {
      expect(calculateDeliveryFee(6)).toBe(55000);
      expect(calculateDeliveryFee(10)).toBe(55000);
   });

   it("Rp65.000 untuk di atas 10 sampai tepat 15 km", () => {
      expect(calculateDeliveryFee(11)).toBe(65000);
      expect(calculateDeliveryFee(15)).toBe(65000);
   });

   it("Rp75.000 untuk di atas 15 sampai tepat 20 km", () => {
      expect(calculateDeliveryFee(16)).toBe(75000);
      expect(calculateDeliveryFee(20)).toBe(75000);
   });

   it("Rp85.000 untuk di atas 20 sampai tepat 25 km", () => {
      expect(calculateDeliveryFee(21)).toBe(85000);
      expect(calculateDeliveryFee(25)).toBe(85000);
   });

   it("null untuk jarak lebih dari 25 km (di luar jangkauan)", () => {
      expect(calculateDeliveryFee(25.1)).toBeNull();
      expect(calculateDeliveryFee(100)).toBeNull();
   });

   it("batas jangkauan tetap 25 km", () => {
      expect(MAX_DELIVERY_DISTANCE_KM).toBe(25);
   });
});

describe("isRequestCakeDateValid", () => {
   beforeEach(() => {
      vi.useFakeTimers();
      // Rabu, 1 Juli 2026 pukul 10:00 waktu lokal
      vi.setSystemTime(new Date(2026, 6, 1, 10, 0, 0));
   });

   afterEach(() => {
      vi.useRealTimers();
   });

   it("jeda minimal tetap 3 hari", () => {
      expect(MIN_DAYS_BEFORE_CAKE_DATE).toBe(3);
   });

   it("menolak hari ini", () => {
      expect(isRequestCakeDateValid(new Date(2026, 6, 1))).toBe(false);
   });

   it("menolak H+2", () => {
      expect(isRequestCakeDateValid(new Date(2026, 6, 3))).toBe(false);
   });

   it("menolak H+2 walau jamnya paling akhir", () => {
      expect(isRequestCakeDateValid(new Date(2026, 6, 3, 23, 59))).toBe(false);
   });

   it("menerima H+3", () => {
      expect(isRequestCakeDateValid(new Date(2026, 6, 4))).toBe(true);
   });

   it("menerima H+3 walau jamnya lebih awal dari jam pemesanan", () => {
      expect(isRequestCakeDateValid(new Date(2026, 6, 4, 0, 1))).toBe(true);
   });

   it("menerima tanggal jauh setelah H+3", () => {
      expect(isRequestCakeDateValid(new Date(2026, 11, 25))).toBe(true);
   });

   it("menghitung per tanggal: pesan jam 23:59 tetap boleh memilih H+3", () => {
      vi.setSystemTime(new Date(2026, 6, 1, 23, 59, 0));
      expect(isRequestCakeDateValid(new Date(2026, 6, 4))).toBe(true);
   });

   it("menghitung per tanggal: pesan jam 00:01 tetap menolak H+2", () => {
      vi.setSystemTime(new Date(2026, 6, 1, 0, 1, 0));
      expect(isRequestCakeDateValid(new Date(2026, 6, 3, 23, 59))).toBe(false);
   });

   it("menerima tanggal dalam bentuk teks", () => {
      expect(isRequestCakeDateValid("2026-07-04T00:00:00")).toBe(true);
      expect(isRequestCakeDateValid("2026-07-03T00:00:00")).toBe(false);
   });

   it("melewati pergantian bulan dengan benar", () => {
      vi.setSystemTime(new Date(2026, 6, 30, 12, 0, 0));
      expect(isRequestCakeDateValid(new Date(2026, 7, 1))).toBe(false);
      expect(isRequestCakeDateValid(new Date(2026, 7, 2))).toBe(true);
   });
});
