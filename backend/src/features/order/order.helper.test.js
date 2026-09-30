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

   it("Rp30.000 untuk jarak di bawah 5 km", () => {
      expect(calculateDeliveryFee(0.1)).toBe(30000);
      expect(calculateDeliveryFee(4.9)).toBe(30000);
   });

   it("Rp45.000 mulai tepat 5 km", () => {
      expect(calculateDeliveryFee(5)).toBe(45000);
   });

   it("Rp45.000 sampai tepat 10 km", () => {
      expect(calculateDeliveryFee(10)).toBe(45000);
   });

   // Komentar di kode menyebut "11–15 km", tapi kodenya memakai `<= 10`, jadi
   // jarak di antara 10 dan 11 km sudah masuk tarif berikutnya. Lihat bagian
   // "Temuan" di RENCANA-TESTING.md.
   it("Rp55.000 untuk 10,5 km", () => {
      expect(calculateDeliveryFee(10.5)).toBe(55000);
   });

   it("Rp55.000 untuk 11 sampai 15 km", () => {
      expect(calculateDeliveryFee(11)).toBe(55000);
      expect(calculateDeliveryFee(15)).toBe(55000);
   });

   it("Rp65.000 untuk di atas 15 sampai 20 km", () => {
      expect(calculateDeliveryFee(15.1)).toBe(65000);
      expect(calculateDeliveryFee(20)).toBe(65000);
   });

   it("Rp75.000 untuk di atas 20 sampai tepat 25 km", () => {
      expect(calculateDeliveryFee(20.1)).toBe(75000);
      expect(calculateDeliveryFee(25)).toBe(75000);
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
