import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
   recordVisit,
   getVisitorStats,
   getOrderStats,
   getDashboardStats,
} from "./analytics.service.js";
import * as analyticsRepository from "./analytics.repository.js";

vi.mock("./analytics.repository.js");

// Catatan "sudah tercatat hari ini" disimpan di memori modul dan baru
// dikosongkan saat ganti hari. Supaya test tidak saling memengaruhi, setiap
// test berjalan di tanggal yang berbeda.
let dayOffset = 0;

beforeEach(() => {
   vi.resetAllMocks();
   vi.useFakeTimers({ toFake: ["Date"] });
   dayOffset += 1;
   vi.setSystemTime(new Date(2026, 0, dayOffset, 10, 0, 0));
});

afterEach(() => {
   vi.useRealTimers();
});

const IP = "103.10.20.30";
const visitorId = (n) =>
   `3f2b8c1e-4a5d-4e6f-9a7b-${String(n).padStart(12, "0")}`;

describe("recordVisit", () => {
   it("mencatat kunjungan pertama hari ini dengan tanggal tanpa jam", async () => {
      await recordVisit(visitorId(1), "user-1", IP);

      expect(analyticsRepository.upsertVisitorLog).toHaveBeenCalledTimes(1);
      const [id, date, userId] =
         analyticsRepository.upsertVisitorLog.mock.calls[0];
      expect(id).toBe(visitorId(1));
      expect(userId).toBe("user-1");
      expect([date.getHours(), date.getMinutes(), date.getSeconds()]).toEqual([
         0, 0, 0,
      ]);
   });

   it("tidak mencatat apa pun tanpa visitorId", async () => {
      await recordVisit(null, null, IP);
      expect(analyticsRepository.upsertVisitorLog).not.toHaveBeenCalled();
   });

   it("pengunjung yang sama hanya ditulis sekali per hari", async () => {
      await recordVisit(visitorId(1), null, IP);
      await recordVisit(visitorId(1), null, IP);
      await recordVisit(visitorId(1), null, "8.8.8.8");

      expect(analyticsRepository.upsertVisitorLog).toHaveBeenCalledTimes(1);
   });

   it("pengunjung yang sama dicatat lagi keesokan harinya", async () => {
      await recordVisit(visitorId(1), null, IP);
      vi.setSystemTime(new Date(2026, 0, dayOffset + 1, 9, 0, 0));
      dayOffset += 1;
      await recordVisit(visitorId(1), null, IP);

      expect(analyticsRepository.upsertVisitorLog).toHaveBeenCalledTimes(2);
   });

   it("satu IP maksimal mendaftarkan 30 pengunjung baru per hari", async () => {
      for (let n = 1; n <= 31; n++) {
         await recordVisit(visitorId(n), null, IP);
      }

      expect(analyticsRepository.upsertVisitorLog).toHaveBeenCalledTimes(30);
      expect(analyticsRepository.upsertVisitorLog).not.toHaveBeenCalledWith(
         visitorId(31),
         expect.anything(),
         null
      );
   });

   it("batas per IP tidak memengaruhi IP lain", async () => {
      for (let n = 1; n <= 30; n++) {
         await recordVisit(visitorId(n), null, IP);
      }
      await recordVisit(visitorId(99), null, "8.8.8.8");

      expect(analyticsRepository.upsertVisitorLog).toHaveBeenCalledWith(
         visitorId(99),
         expect.any(Date),
         null
      );
   });

   it("kunjungan ulang pengunjung lama tidak memakai jatah IP", async () => {
      await recordVisit(visitorId(1), null, IP);
      for (let i = 0; i < 50; i++) {
         await recordVisit(visitorId(1), null, IP);
      }
      for (let n = 2; n <= 30; n++) {
         await recordVisit(visitorId(n), null, IP);
      }

      expect(analyticsRepository.upsertVisitorLog).toHaveBeenCalledTimes(30);
   });

   it("jatah IP kembali penuh keesokan harinya", async () => {
      for (let n = 1; n <= 30; n++) {
         await recordVisit(visitorId(n), null, IP);
      }
      dayOffset += 1;
      vi.setSystemTime(new Date(2026, 0, dayOffset, 9, 0, 0));
      await recordVisit(visitorId(31), null, IP);

      expect(analyticsRepository.upsertVisitorLog).toHaveBeenCalledTimes(31);
   });

   it("tanpa IP tidak dibatasi", async () => {
      for (let n = 1; n <= 31; n++) {
         await recordVisit(visitorId(n), null, null);
      }
      expect(analyticsRepository.upsertVisitorLog).toHaveBeenCalledTimes(31);
   });

   it("kalau penulisan gagal, kunjungan yang sama boleh dicoba lagi", async () => {
      analyticsRepository.upsertVisitorLog.mockRejectedValueOnce(
         new Error("kuota habis")
      );

      await expect(recordVisit(visitorId(1), null, IP)).rejects.toThrow(
         "kuota habis"
      );
      await recordVisit(visitorId(1), null, IP);

      expect(analyticsRepository.upsertVisitorLog).toHaveBeenCalledTimes(2);
   });
});

describe("rentang tanggal statistik", () => {
   beforeEach(() => {
      analyticsRepository.countVisitorsByDateRange.mockResolvedValue([]);
      analyticsRepository.countVisitorsGroupedByDate.mockResolvedValue([]);
   });

   it("tanpa rentang berarti semua data", async () => {
      await getVisitorStats(undefined, undefined);
      expect(analyticsRepository.countVisitorsGroupedByDate).toHaveBeenCalled();
      expect(
         analyticsRepository.countVisitorsByDateRange
      ).not.toHaveBeenCalled();
   });

   it("rentang dimulai jam 00:00 dan berakhir jam 23:59:59.999", async () => {
      await getVisitorStats(
         new Date(2026, 6, 1, 15, 30),
         new Date(2026, 6, 31, 8, 0)
      );

      const [start, end] =
         analyticsRepository.countVisitorsByDateRange.mock.calls[0];
      expect(start).toEqual(new Date(2026, 6, 1, 0, 0, 0, 0));
      expect(end).toEqual(new Date(2026, 6, 31, 23, 59, 59, 999));
   });

   it("rentang satu hari mencakup seluruh hari itu", async () => {
      await getVisitorStats(new Date(2026, 6, 1), new Date(2026, 6, 1));

      const [start, end] =
         analyticsRepository.countVisitorsByDateRange.mock.calls[0];
      expect(start).toEqual(new Date(2026, 6, 1, 0, 0, 0, 0));
      expect(end).toEqual(new Date(2026, 6, 1, 23, 59, 59, 999));
   });

   it("menolak kalau hanya salah satu tanggal diisi", async () => {
      await expect(
         getVisitorStats(new Date(2026, 6, 1), undefined)
      ).rejects.toMatchObject({
         statusCode: 422,
         message: "Parameter 'from' dan 'to' harus diisi bersamaan",
      });
   });

   it("menolak tanggal awal setelah tanggal akhir", async () => {
      await expect(
         getVisitorStats(new Date(2026, 6, 31), new Date(2026, 6, 1))
      ).rejects.toMatchObject({
         statusCode: 422,
         message: "'from' tidak boleh lebih besar dari 'to'",
      });
   });

   it("menolak tanggal yang tidak bisa dibaca", async () => {
      await expect(
         getVisitorStats("kemarin", "hari ini")
      ).rejects.toMatchObject({
         statusCode: 422,
         message: "Format tanggal tidak valid",
      });
   });
});

describe("data grafik", () => {
   it("mengelompokkan per bulan memakai query bulanan", async () => {
      analyticsRepository.countOrdersByMonthRange.mockResolvedValue([]);
      await getOrderStats(
         new Date(2026, 0, 1),
         new Date(2026, 11, 31),
         "month"
      );
      expect(analyticsRepository.countOrdersByMonthRange).toHaveBeenCalled();
   });

   // Sumbernya campur: groupBy Prisma memberi { date, _count }, query mentah
   // per bulan memberi { month, count } dengan count berupa BigInt.
   it("menyamakan bentuk hasil harian dan bulanan menjadi { date, count }", async () => {
      const day = new Date(2026, 6, 1);
      const month = new Date(2026, 6, 1);
      analyticsRepository.countVisitorsGroupedByDate.mockResolvedValue([
         { date: day, _count: { visitorId: 12 } },
      ]);
      analyticsRepository.countVisitorsGroupedByMonth.mockResolvedValue([
         { month, count: 340n },
      ]);

      await expect(getVisitorStats()).resolves.toEqual([
         { date: day, count: 12 },
      ]);
      await expect(
         getVisitorStats(undefined, undefined, "month")
      ).resolves.toEqual([{ date: month, count: 340 }]);
   });

   it("dashboard menggabungkan grafik dan total sepanjang waktu", async () => {
      analyticsRepository.countVisitorsGroupedByDate.mockResolvedValue([]);
      analyticsRepository.countOrdersGroupedByDate.mockResolvedValue([]);
      analyticsRepository.countAllVisitors.mockResolvedValue(1500);
      analyticsRepository.countAllOrders.mockResolvedValue(42);

      await expect(getDashboardStats()).resolves.toEqual({
         visitors: [],
         orders: [],
         totalVisitors: 1500,
         totalOrders: 42,
      });
   });
});
