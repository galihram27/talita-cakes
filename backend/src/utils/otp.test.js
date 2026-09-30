import { describe, it, expect } from "vitest";
import {
   OTP_LENGTH,
   generateOtpCode,
   hashOtpCode,
   compareOtpCode,
} from "./otp.js";

describe("generateOtpCode", () => {
   it("panjang kode 6 digit", () => {
      expect(OTP_LENGTH).toBe(6);
   });

   it("selalu 6 digit angka, tanpa awalan 0", () => {
      for (let i = 0; i < 200; i++) {
         expect(generateOtpCode()).toMatch(/^[1-9][0-9]{5}$/);
      }
   });

   it("mengembalikan teks, bukan angka", () => {
      expect(typeof generateOtpCode()).toBe("string");
   });
});

describe("hashOtpCode & compareOtpCode", () => {
   it("kode yang benar cocok dengan hash-nya", async () => {
      const hash = await hashOtpCode("482913");
      await expect(compareOtpCode("482913", hash)).resolves.toBe(true);
   });

   it("kode yang salah tidak cocok", async () => {
      const hash = await hashOtpCode("482913");
      await expect(compareOtpCode("482914", hash)).resolves.toBe(false);
   });

   it("hash tidak sama dengan kode aslinya", async () => {
      const hash = await hashOtpCode("482913");
      expect(hash).not.toContain("482913");
   });
});
