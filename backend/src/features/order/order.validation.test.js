import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
   checkoutSchema,
   previewSchema,
   orderIdParamSchema,
   updateOrderStatusSchema,
} from "./order.validation.js";

// Hari ini dibuat tetap: Rabu, 1 Juli 2026. H+3 = 4 Juli.
const H_PLUS_3 = "2026-07-04";
const H_PLUS_2 = "2026-07-03";

const pickup = {
   fulfillmentType: "PICKUP",
   requestCakeDate: H_PLUS_3,
};

const deliveryForMyself = {
   fulfillmentType: "DELIVERY",
   requestCakeDate: H_PLUS_3,
   recipientType: "FOR_MYSELF",
   address: "Jl. Margonda Raya No. 100, Depok",
   addressLat: -6.3754,
   addressLng: 106.8323,
};

const deliveryForSomeoneElse = {
   ...deliveryForMyself,
   recipientType: "FOR_SOMEONE_ELSE",
   recipientName: "Budi",
   recipientPhone: "081234567890",
   recipientDataConsent: true,
};

const messagesOf = (result) => result.error.issues.map((i) => i.message);

beforeEach(() => {
   vi.useFakeTimers();
   vi.setSystemTime(new Date(2026, 6, 1, 10, 0, 0));
});

afterEach(() => {
   vi.useRealTimers();
});

describe("checkoutSchema", () => {
   it("menerima pesanan ambil sendiri", () => {
      expect(checkoutSchema.safeParse(pickup).success).toBe(true);
   });

   it("menerima pengiriman untuk diri sendiri", () => {
      expect(checkoutSchema.safeParse(deliveryForMyself).success).toBe(true);
   });

   it("menerima pengiriman untuk orang lain dengan data penerima lengkap", () => {
      expect(checkoutSchema.safeParse(deliveryForSomeoneElse).success).toBe(
         true
      );
   });

   it("mengubah tanggal dan koordinat berbentuk teks", () => {
      const result = checkoutSchema.safeParse({
         ...deliveryForMyself,
         addressLat: "-6.3754",
         addressLng: "106.8323",
      });
      expect(result.data.requestCakeDate).toBeInstanceOf(Date);
      expect(result.data.addressLat).toBe(-6.3754);
      expect(result.data.addressLng).toBe(106.8323);
   });

   it("menolak tanggal kurang dari H+3", () => {
      const result = checkoutSchema.safeParse({
         ...pickup,
         requestCakeDate: H_PLUS_2,
      });
      expect(messagesOf(result)).toContain(
         "Request cake date minimal 3 hari dari sekarang"
      );
   });

   it("menolak pesanan tanpa tanggal", () => {
      expect(
         checkoutSchema.safeParse({ fulfillmentType: "PICKUP" }).success
      ).toBe(false);
   });

   it("menolak tanggal yang tidak bisa dibaca", () => {
      const result = checkoutSchema.safeParse({
         ...pickup,
         requestCakeDate: "besok",
      });
      expect(messagesOf(result)).toContain("requestCakeDate tidak valid");
   });

   it("menolak cara pengambilan yang tidak dikenal", () => {
      const result = checkoutSchema.safeParse({
         ...pickup,
         fulfillmentType: "GOJEK",
      });
      expect(messagesOf(result)).toContain(
         "fulfillmentType harus PICKUP atau DELIVERY"
      );
   });

   it("menolak pengiriman tanpa koordinat", () => {
      const { addressLat, addressLng, ...noCoords } = deliveryForMyself;
      expect(messagesOf(checkoutSchema.safeParse(noCoords))).toContain(
         "Titik lokasi (map) wajib diisi untuk delivery"
      );
   });

   it("menolak pengiriman yang hanya punya satu koordinat", () => {
      const { addressLng, ...noLng } = deliveryForMyself;
      expect(messagesOf(checkoutSchema.safeParse(noLng))).toContain(
         "Titik lokasi (map) wajib diisi untuk delivery"
      );
   });

   it("menolak pengiriman tanpa alamat", () => {
      const { address, ...noAddress } = deliveryForMyself;
      expect(messagesOf(checkoutSchema.safeParse(noAddress))).toContain(
         "address wajib diisi untuk delivery"
      );
   });

   it("menolak alamat yang hanya berisi spasi", () => {
      const result = checkoutSchema.safeParse({
         ...deliveryForMyself,
         address: "   ",
      });
      expect(messagesOf(result)).toContain(
         "address wajib diisi untuk delivery"
      );
   });

   it("menolak pengiriman tanpa jenis penerima", () => {
      const { recipientType, ...noType } = deliveryForMyself;
      expect(messagesOf(checkoutSchema.safeParse(noType))).toContain(
         "recipientType wajib diisi untuk delivery"
      );
   });

   it("pengiriman untuk orang lain wajib nama, telepon, dan izin penerima", () => {
      const { recipientName, recipientPhone, recipientDataConsent, ...rest } =
         deliveryForSomeoneElse;
      const messages = messagesOf(checkoutSchema.safeParse(rest));
      expect(messages).toContain("recipientName wajib diisi");
      expect(messages).toContain("recipientPhone wajib diisi");
      expect(messages).toContain(
         "Anda harus konfirmasi sudah mendapat izin dari penerima untuk membagikan datanya"
      );
   });

   it("menolak izin penerima bernilai false", () => {
      const result = checkoutSchema.safeParse({
         ...deliveryForSomeoneElse,
         recipientDataConsent: false,
      });
      expect(result.success).toBe(false);
   });

   it("menerima izin penerima berbentuk teks dari form", () => {
      const result = checkoutSchema.safeParse({
         ...deliveryForSomeoneElse,
         recipientDataConsent: " TRUE ",
      });
      expect(result.data.recipientDataConsent).toBe(true);
   });

   it("menolak izin penerima berbentuk teks selain true atau false", () => {
      const result = checkoutSchema.safeParse({
         ...deliveryForSomeoneElse,
         recipientDataConsent: "ya",
      });
      expect(messagesOf(result)).toContain(
         "recipientDataConsent harus true atau false"
      );
   });

   it("menolak nomor telepon kurang dari 8 karakter", () => {
      expect(
         checkoutSchema.safeParse({
            ...deliveryForSomeoneElse,
            recipientPhone: "0812",
         }).success
      ).toBe(false);
   });

   it("ambil sendiri tidak memerlukan alamat", () => {
      expect(
         checkoutSchema.safeParse({ ...pickup, recipientType: undefined })
            .success
      ).toBe(true);
   });
});

describe("previewSchema", () => {
   it("menerima pengiriman yang baru berisi koordinat", () => {
      expect(
         previewSchema.safeParse({
            fulfillmentType: "DELIVERY",
            addressLat: -6.3754,
            addressLng: 106.8323,
         }).success
      ).toBe(true);
   });

   it("menerima alamat kosong selama koordinat ada", () => {
      expect(
         previewSchema.safeParse({ ...deliveryForMyself, address: "" }).success
      ).toBe(true);
   });

   it("tetap menolak pengiriman tanpa koordinat", () => {
      const { addressLat, addressLng, ...noCoords } = deliveryForMyself;
      expect(messagesOf(previewSchema.safeParse(noCoords))).toContain(
         "Titik lokasi (map) wajib diisi untuk delivery"
      );
   });

   it("tetap menolak tanggal kurang dari H+3 kalau tanggal dikirim", () => {
      const result = previewSchema.safeParse({
         ...deliveryForMyself,
         requestCakeDate: H_PLUS_2,
      });
      expect(messagesOf(result)).toContain(
         "Request cake date minimal 3 hari dari sekarang"
      );
   });
});

describe("orderIdParamSchema & updateOrderStatusSchema", () => {
   it("id pesanan harus UUID", () => {
      expect(orderIdParamSchema.safeParse({ id: "abc" }).success).toBe(false);
   });

   it("status harus salah satu status pesanan", () => {
      for (const status of ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]) {
         expect(updateOrderStatusSchema.safeParse({ status }).success).toBe(
            true
         );
      }
      expect(
         updateOrderStatusSchema.safeParse({ status: "PAID" }).success
      ).toBe(false);
   });
});
