import {
   describe,
   it,
   expect,
   beforeAll,
   beforeEach,
   afterEach,
   vi,
} from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
   login,
   forgotPassword,
   verifyEmail,
   verifyResetOtp,
   resetPassword,
} from "./auth.service.js";
import { OTP_MAX_ATTEMPTS } from "../../utils/otp.js";
import * as authRepository from "./auth.repository.js";
import { sendOtpEmail } from "../../utils/email.js";

vi.mock("./auth.repository.js");
// Email asli dikirim lewat Resend; test tidak boleh mengirim apa pun. Tiruannya
// ditulis manual karena tiruan otomatis tetap memuat modul aslinya, dan klien
// Resend gagal dibuat tanpa kunci API.
vi.mock("../../utils/email.js", () => ({ sendOtpEmail: vi.fn() }));

const PASSWORD = "rahasia1";
let passwordHash;

const verifiedUser = () => ({
   id: "user-1",
   name: "Siti Aminah",
   email: "siti@example.com",
   phone: "081234567890",
   role: "USER",
   isVerified: true,
   password: passwordHash,
});

beforeAll(async () => {
   // Putaran hash dibuat kecil supaya test cepat; cara mencocokkannya sama.
   passwordHash = await bcrypt.hash(PASSWORD, 4);
});

beforeEach(() => {
   vi.resetAllMocks();
   vi.stubEnv("JWT_SECRET", "rahasia-access");
   vi.stubEnv("JWT_REFRESH_SECRET", "rahasia-refresh");
});

afterEach(() => {
   vi.unstubAllEnvs();
});

describe("login", () => {
   const loginError = async (data) => {
      try {
         await login(data);
      } catch (err) {
         return err;
      }
      throw new Error("login seharusnya gagal");
   };

   // Kalau pesannya berbeda, orang luar bisa menebak email mana yang
   // terdaftar dengan mencoba login.
   it("email tidak terdaftar dan sandi salah menghasilkan jawaban yang sama persis", async () => {
      authRepository.getUserByEmail.mockResolvedValueOnce(null);
      const unknownEmail = await loginError({
         email: "tidak.ada@example.com",
         password: PASSWORD,
      });

      authRepository.getUserByEmail.mockResolvedValueOnce(verifiedUser());
      const wrongPassword = await loginError({
         email: "siti@example.com",
         password: "salah123",
      });

      expect(unknownEmail.message).toBe("Invalid email or password");
      expect(wrongPassword.message).toBe(unknownEmail.message);
      expect(wrongPassword.statusCode).toBe(unknownEmail.statusCode);
      expect(wrongPassword.statusCode).toBe(401);
      expect(wrongPassword.details).toEqual(unknownEmail.details);
   });

   it("akun yang belum verifikasi email tidak bisa login", async () => {
      authRepository.getUserByEmail.mockResolvedValue({
         ...verifiedUser(),
         isVerified: false,
      });
      authRepository.findLatestOtpByUserAndPurpose.mockResolvedValue(null);

      const err = await loginError({
         email: "siti@example.com",
         password: PASSWORD,
      });

      expect(err.statusCode).toBe(403);
      expect(err.details).toEqual({
         code: "EMAIL_NOT_VERIFIED",
         email: "siti@example.com",
      });
      expect(authRepository.createRefreshToken).not.toHaveBeenCalled();
   });

   it("akun belum verifikasi otomatis dikirimi kode OTP baru", async () => {
      authRepository.getUserByEmail.mockResolvedValue({
         ...verifiedUser(),
         isVerified: false,
      });
      authRepository.findLatestOtpByUserAndPurpose.mockResolvedValue(null);

      await loginError({ email: "siti@example.com", password: PASSWORD });

      expect(sendOtpEmail).toHaveBeenCalledWith(
         expect.objectContaining({
            to: "siti@example.com",
            purpose: "EMAIL_VERIFICATION",
         })
      );
   });

   it("tidak mengirim OTP baru selama masih dalam jeda kirim ulang", async () => {
      authRepository.getUserByEmail.mockResolvedValue({
         ...verifiedUser(),
         isVerified: false,
      });
      authRepository.findLatestOtpByUserAndPurpose.mockResolvedValue({
         createdAt: new Date(Date.now() - 10 * 1000),
      });

      await loginError({ email: "siti@example.com", password: PASSWORD });

      expect(sendOtpEmail).not.toHaveBeenCalled();
   });

   it("sandi salah pada akun belum verifikasi tetap dijawab sandi salah", async () => {
      authRepository.getUserByEmail.mockResolvedValue({
         ...verifiedUser(),
         isVerified: false,
      });

      const err = await loginError({
         email: "siti@example.com",
         password: "salah123",
      });

      expect(err.statusCode).toBe(401);
      expect(sendOtpEmail).not.toHaveBeenCalled();
   });

   it("menolak role yang tidak dikenal", async () => {
      authRepository.getUserByEmail.mockResolvedValue({
         ...verifiedUser(),
         role: "SUPERUSER",
      });

      const err = await loginError({
         email: "siti@example.com",
         password: PASSWORD,
      });

      expect(err.statusCode).toBe(500);
   });

   it("login berhasil memberi token dan data pengguna tanpa sandi", async () => {
      authRepository.getUserByEmail.mockResolvedValue(verifiedUser());

      const result = await login({
         email: "siti@example.com",
         password: PASSWORD,
      });

      expect(result.user).toEqual({
         id: "user-1",
         name: "Siti Aminah",
         email: "siti@example.com",
         phone: "081234567890",
         role: "USER",
      });
      expect(jwt.verify(result.accessToken, "rahasia-access")).toMatchObject({
         userId: "user-1",
         role: "USER",
      });
   });

   it("refresh token disimpan dalam bentuk hash dan berlaku 7 hari", async () => {
      authRepository.getUserByEmail.mockResolvedValue(verifiedUser());
      const before = Date.now();

      const { refreshToken } = await login({
         email: "siti@example.com",
         password: PASSWORD,
      });

      const saved = authRepository.createRefreshToken.mock.calls[0][0];
      expect(saved.userId).toBe("user-1");
      expect(saved.token).not.toBe(refreshToken);
      await expect(bcrypt.compare(refreshToken, saved.token)).resolves.toBe(
         true
      );

      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(saved.expiresAt.getTime() - before).toBeGreaterThanOrEqual(
         sevenDaysMs
      );
      expect(saved.expiresAt.getTime() - before).toBeLessThan(
         sevenDaysMs + 5000
      );
   });
});

describe("forgotPassword", () => {
   // Jawaban yang sama untuk email terdaftar dan tidak, supaya endpoint ini
   // tidak bisa dipakai mengecek email mana yang punya akun.
   it("diam saja untuk email yang tidak terdaftar", async () => {
      authRepository.getUserByEmail.mockResolvedValue(null);
      await expect(
         forgotPassword("tidak.ada@example.com")
      ).resolves.toBeUndefined();
      expect(sendOtpEmail).not.toHaveBeenCalled();
   });

   it("mengirim kode reset untuk email terdaftar", async () => {
      authRepository.getUserByEmail.mockResolvedValue(verifiedUser());
      authRepository.findLatestOtpByUserAndPurpose.mockResolvedValue(null);

      await expect(forgotPassword("siti@example.com")).resolves.toBeUndefined();

      expect(sendOtpEmail).toHaveBeenCalledWith(
         expect.objectContaining({ purpose: "PASSWORD_RESET" })
      );
      const savedOtp = authRepository.createOtpCode.mock.calls[0][0];
      const sentCode = sendOtpEmail.mock.calls[0][0].code;
      expect(savedOtp.code).not.toBe(sentCode);
   });
});

// =========================
// Batas percobaan kode OTP
// =========================

describe("batas percobaan kode OTP", () => {
   const CODE = "482913";
   const EMAIL = "siti@example.com";
   let codeHash;

   beforeAll(async () => {
      codeHash = await bcrypt.hash(CODE, 4);
   });

   // Meniru baris OTP di basis data beserta aturan query consumeOtpAttempt:
   // percobaan hanya dicatat kalau jumlahnya masih di bawah batas.
   const storedOtp = ({ purpose = "PASSWORD_RESET", expired = false } = {}) => {
      const otp = {
         id: "otp-1",
         userId: "user-1",
         purpose,
         code: codeHash,
         attempts: 0,
         expiresAt: new Date(Date.now() + (expired ? -1 : 1) * 60 * 1000),
      };
      authRepository.findLatestOtpByUserAndPurpose.mockResolvedValue(otp);
      authRepository.consumeOtpAttempt.mockImplementation(async (id, max) => {
         if (otp.attempts >= max) return false;
         otp.attempts += 1;
         return true;
      });
      authRepository.releaseOtpAttempt.mockImplementation(async () => {
         otp.attempts -= 1;
      });
      return otp;
   };

   const guess = (code) =>
      verifyResetOtp({ email: EMAIL, code }).then(
         () => "benar",
         (err) => err.message
      );

   beforeEach(() => {
      authRepository.getUserByEmail.mockResolvedValue(verifiedUser());
   });

   it("batasnya 5 kali per kode", () => {
      expect(OTP_MAX_ATTEMPTS).toBe(5);
   });

   it("kode salah ditolak dan dicatat sebagai satu percobaan", async () => {
      const otp = storedOtp();

      expect(await guess("000000")).toBe("Kode OTP salah");
      expect(authRepository.consumeOtpAttempt).toHaveBeenCalledWith(
         "otp-1",
         OTP_MAX_ATTEMPTS
      );
      expect(otp.attempts).toBe(1);
   });

   it("kode benar tidak memakai jatah", async () => {
      const otp = storedOtp();

      expect(await guess(CODE)).toBe("benar");
      expect(otp.attempts).toBe(0);
   });

   it("setelah 5 kali salah, kode yang benar pun ditolak", async () => {
      storedOtp();
      for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) {
         expect(await guess("000000")).toBe("Kode OTP salah");
      }

      expect(await guess(CODE)).toBe(
         "Kode OTP sudah terlalu sering salah, silakan minta kode baru"
      );
   });

   // Percobaan harus dicatat sebelum kode dicocokkan. Kalau urutannya
   // terbalik, tebakan yang dikirim bersamaan bisa sama-sama dicocokkan
   // sebelum hitungannya naik.
   it("setelah jatah habis, kode tidak lagi dicocokkan sama sekali", async () => {
      storedOtp().attempts = OTP_MAX_ATTEMPTS;
      const compare = vi.spyOn(bcrypt, "compare");

      await guess(CODE);

      expect(compare).not.toHaveBeenCalled();
      compare.mockRestore();
   });

   it("salah ketik 4 kali lalu benar: cek kode dan ganti sandi tetap berhasil", async () => {
      storedOtp();
      for (let i = 0; i < OTP_MAX_ATTEMPTS - 1; i++) await guess("000000");

      expect(await guess(CODE)).toBe("benar");
      await expect(
         resetPassword({ email: EMAIL, code: CODE, newPassword: "sandiBaru1" })
      ).resolves.toBeUndefined();
      expect(authRepository.updateUserPassword).toHaveBeenCalled();
   });

   it("kode kedaluwarsa tidak memakai jatah", async () => {
      storedOtp({ expired: true });

      expect(await guess(CODE)).toBe(
         "Kode OTP sudah kedaluwarsa, silakan minta kode baru"
      );
      expect(authRepository.consumeOtpAttempt).not.toHaveBeenCalled();
   });

   it("ganti sandi juga ditolak setelah jatah habis", async () => {
      storedOtp().attempts = OTP_MAX_ATTEMPTS;

      await expect(
         resetPassword({ email: EMAIL, code: CODE, newPassword: "sandiBaru1" })
      ).rejects.toThrow("Kode OTP sudah terlalu sering salah");
      expect(authRepository.updateUserPassword).not.toHaveBeenCalled();
   });

   it("verifikasi email juga memakai batas yang sama", async () => {
      authRepository.getUserByEmail.mockResolvedValue({
         ...verifiedUser(),
         isVerified: false,
      });
      storedOtp({ purpose: "EMAIL_VERIFICATION" }).attempts = OTP_MAX_ATTEMPTS;

      await expect(verifyEmail({ email: EMAIL, code: CODE })).rejects.toThrow(
         "Kode OTP sudah terlalu sering salah"
      );
      expect(authRepository.markUserVerified).not.toHaveBeenCalled();
   });
});
