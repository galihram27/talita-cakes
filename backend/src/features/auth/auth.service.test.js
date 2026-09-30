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
import { login, forgotPassword } from "./auth.service.js";
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
