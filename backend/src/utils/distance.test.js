import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { calculateDistanceKm, getDeliveryDistanceKm } from "./distance.js";

// Satu derajat lintang di bumi berjari-jari 6371 km = 6371 x pi / 180 km.
const ONE_DEGREE_KM = (6371 * Math.PI) / 180;

// Dua titik di Depok, beberapa kilometer garis lurus.
const FROM = [-6.4025, 106.7942];
const TO = [-6.3754, 106.8123];

describe("calculateDistanceKm", () => {
   it("0 untuk dua titik yang sama", () => {
      expect(calculateDistanceKm(...FROM, ...FROM)).toBe(0);
   });

   it("satu derajat lintang sama dengan jarak yang sudah diketahui", () => {
      expect(calculateDistanceKm(0, 0, 1, 0)).toBeCloseTo(ONE_DEGREE_KM, 6);
   });

   it("satu derajat bujur di khatulistiwa sama dengan satu derajat lintang", () => {
      expect(calculateDistanceKm(0, 0, 0, 1)).toBeCloseTo(ONE_DEGREE_KM, 6);
   });

   it("sama saja dari arah mana pun", () => {
      expect(calculateDistanceKm(...FROM, ...TO)).toBeCloseTo(
         calculateDistanceKm(...TO, ...FROM),
         10
      );
   });
});

describe("getDeliveryDistanceKm", () => {
   const straightKm = calculateDistanceKm(...FROM, ...TO);
   let fetchMock;

   beforeEach(() => {
      fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      vi.stubEnv("HERE_API_KEY", "kunci-test");
      // Fallback sengaja mencetak peringatan; tidak perlu memenuhi keluaran test.
      vi.spyOn(console, "warn").mockImplementation(() => {});
   });

   afterEach(() => {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
   });

   const hereResponse = (sections) => ({
      ok: true,
      json: async () => ({ routes: [{ sections }] }),
   });

   it("memakai jarak rute HERE kalau berhasil", async () => {
      fetchMock.mockResolvedValue(
         hereResponse([{ summary: { length: 5200 } }])
      );
      await expect(getDeliveryDistanceKm(...FROM, ...TO)).resolves.toBe(5.2);
   });

   it("menjumlahkan panjang semua bagian rute", async () => {
      fetchMock.mockResolvedValue(
         hereResponse([
            { summary: { length: 3000 } },
            { summary: { length: 1500 } },
         ])
      );
      await expect(getDeliveryDistanceKm(...FROM, ...TO)).resolves.toBe(4.5);
   });

   it("meminta rute motor dengan koordinat asal dan tujuan", async () => {
      fetchMock.mockResolvedValue(
         hereResponse([{ summary: { length: 1000 } }])
      );
      await getDeliveryDistanceKm(...FROM, ...TO);

      const url = new URL(fetchMock.mock.calls[0][0]);
      expect(url.searchParams.get("transportMode")).toBe("scooter");
      expect(url.searchParams.get("origin")).toBe(FROM.join(","));
      expect(url.searchParams.get("destination")).toBe(TO.join(","));
      expect(url.searchParams.get("apikey")).toBe("kunci-test");
   });

   it("jatuh ke garis lurus tanpa memanggil HERE kalau kunci API kosong", async () => {
      vi.stubEnv("HERE_API_KEY", "");
      await expect(getDeliveryDistanceKm(...FROM, ...TO)).resolves.toBe(
         straightKm
      );
      expect(fetchMock).not.toHaveBeenCalled();
   });

   it("jatuh ke garis lurus kalau HERE membalas error HTTP", async () => {
      fetchMock.mockResolvedValue({
         ok: false,
         status: 429,
         text: async () => "limit",
      });
      await expect(getDeliveryDistanceKm(...FROM, ...TO)).resolves.toBe(
         straightKm
      );
   });

   it("jatuh ke garis lurus kalau jaringan gagal atau waktu habis", async () => {
      fetchMock.mockRejectedValue(new Error("timeout"));
      await expect(getDeliveryDistanceKm(...FROM, ...TO)).resolves.toBe(
         straightKm
      );
   });

   it("jatuh ke garis lurus kalau rute tidak ditemukan", async () => {
      fetchMock.mockResolvedValue({
         ok: true,
         json: async () => ({ routes: [] }),
      });
      await expect(getDeliveryDistanceKm(...FROM, ...TO)).resolves.toBe(
         straightKm
      );
   });

   it("jatuh ke garis lurus kalau panjang rute 0", async () => {
      fetchMock.mockResolvedValue(hereResponse([{ summary: { length: 0 } }]));
      await expect(getDeliveryDistanceKm(...FROM, ...TO)).resolves.toBe(
         straightKm
      );
   });
});
