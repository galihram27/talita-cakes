import { describe, it, expect } from "vitest";
import {
   registerSchema,
   loginSchema,
   verifyEmailSchema,
   resendOtpSchema,
   resetPasswordSchema,
} from "./auth.validation.js";

const validRegister = {
   name: "Siti Aminah",
   email: "siti@example.com",
   password: "rahasia1",
   phone: "081234567890",
   acceptedTerms: true,
};

const messagesOf = (result) => result.error.issues.map((i) => i.message);

describe("registerSchema", () => {
   it("menerima data pendaftaran yang lengkap", () => {
      expect(registerSchema.safeParse(validRegister).success).toBe(true);
   });

   it("menolak email tidak sah", () => {
      const result = registerSchema.safeParse({
         ...validRegister,
         email: "siti@",
      });
      expect(messagesOf(result)).toContain("Invalid email format");
   });

   it("menolak sandi kurang dari 6 karakter", () => {
      const result = registerSchema.safeParse({
         ...validRegister,
         password: "abc1",
      });
      expect(messagesOf(result)).toContain(
         "Password must be at least 6 characters"
      );
   });

   it("menolak sandi lebih dari 20 karakter", () => {
      const result = registerSchema.safeParse({
         ...validRegister,
         password: "a1234567890123456789012",
      });
      expect(messagesOf(result)).toContain(
         "Password must be at most 20 characters"
      );
   });

   it("menolak sandi yang tidak diawali huruf", () => {
      const result = registerSchema.safeParse({
         ...validRegister,
         password: "1rahasia",
      });
      expect(messagesOf(result)).toContain("Password must start with a letter");
   });

   it("menolak sandi tanpa angka", () => {
      const result = registerSchema.safeParse({
         ...validRegister,
         password: "rahasiaku",
      });
      expect(messagesOf(result)).toContain(
         "Password must contain at least one number"
      );
   });

   it("menolak nama yang tidak diawali huruf kapital", () => {
      expect(
         registerSchema.safeParse({ ...validRegister, name: "siti" }).success
      ).toBe(false);
   });

   it("menolak nama yang mengandung angka", () => {
      expect(
         registerSchema.safeParse({ ...validRegister, name: "Siti 2" }).success
      ).toBe(false);
   });

   it("menolak nomor telepon kurang dari 8 karakter", () => {
      const result = registerSchema.safeParse({
         ...validRegister,
         phone: "0812",
      });
      expect(messagesOf(result)).toContain("Phone number is too short");
   });

   it("menolak kalau syarat & ketentuan tidak disetujui", () => {
      const result = registerSchema.safeParse({
         ...validRegister,
         acceptedTerms: false,
      });
      expect(messagesOf(result)).toContain(
         "Kamu harus menyetujui Terms of Use & Privacy Policy"
      );
   });

   it("menolak persetujuan berbentuk teks", () => {
      expect(
         registerSchema.safeParse({ ...validRegister, acceptedTerms: "true" })
            .success
      ).toBe(false);
   });
});

describe("loginSchema", () => {
   // Aturan kekuatan sandi tidak dipakai saat login, supaya akun lama yang
   // dibuat sebelum aturan itu ada tetap bisa masuk.
   it("menerima sandi lama yang tidak memenuhi aturan pendaftaran", () => {
      expect(
         loginSchema.safeParse({ email: "siti@example.com", password: "abc" })
            .success
      ).toBe(true);
   });

   it("menolak sandi kosong", () => {
      const result = loginSchema.safeParse({
         email: "siti@example.com",
         password: "",
      });
      expect(messagesOf(result)).toContain("Password is required");
   });

   it("menolak email tidak sah", () => {
      expect(
         loginSchema.safeParse({ email: "siti", password: "rahasia1" }).success
      ).toBe(false);
   });
});

describe("kode OTP", () => {
   const withCode = (code) =>
      verifyEmailSchema.safeParse({ email: "siti@example.com", code });

   it("menerima 6 digit", () => {
      expect(withCode("482913").success).toBe(true);
   });

   it("menolak kurang dari 6 digit", () => {
      expect(messagesOf(withCode("48291"))).toContain("Kode OTP harus 6 digit");
   });

   it("menolak lebih dari 6 digit", () => {
      expect(messagesOf(withCode("4829130"))).toContain(
         "Kode OTP harus 6 digit"
      );
   });

   it("menolak kode berbentuk angka, bukan teks", () => {
      expect(withCode(482913).success).toBe(false);
   });

   // Skema hanya memeriksa panjang, bukan isi. Tidak berbahaya karena kode
   // tetap dicocokkan dengan hash-nya, tapi dicatat di bagian "Temuan"
   // RENCANA-TESTING.md.
   it("masih menerima 6 karakter yang bukan angka", () => {
      expect(withCode("abcdef").success).toBe(true);
   });

   it("aturan yang sama berlaku saat reset sandi", () => {
      expect(
         resetPasswordSchema.safeParse({
            email: "siti@example.com",
            code: "123",
            newPassword: "rahasia2",
         }).success
      ).toBe(false);
   });

   it("reset sandi memakai aturan kekuatan sandi pendaftaran", () => {
      const result = resetPasswordSchema.safeParse({
         email: "siti@example.com",
         code: "482913",
         newPassword: "abc",
      });
      expect(messagesOf(result)).toContain(
         "Password must be at least 6 characters"
      );
   });
});

describe("resendOtpSchema", () => {
   it("hanya menerima dua keperluan OTP", () => {
      const email = "siti@example.com";
      expect(
         resendOtpSchema.safeParse({ email, purpose: "EMAIL_VERIFICATION" })
            .success
      ).toBe(true);
      expect(
         resendOtpSchema.safeParse({ email, purpose: "PASSWORD_RESET" }).success
      ).toBe(true);
      expect(
         resendOtpSchema.safeParse({ email, purpose: "LOGIN" }).success
      ).toBe(false);
   });
});
