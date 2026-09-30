import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { AppError } from "../../utils/appError.js";

/**
 * Pembatas request untuk endpoint auth, dihitung per IP.
 *
 * Tanpa batas ini, satu orang bisa menebak sandi atau kode OTP tanpa henti,
 * dan bisa mendaftar dengan ribuan alamat email sehingga kuota email habis
 * dan pembeli sungguhan tidak menerima kode OTP. Cooldown 60 detik di
 * auth.service.js hanya berlaku per email, jadi tidak menahan yang terakhir.
 *
 * Satu instance limiter yang dipasang di beberapa route berbagi hitungan.
 * Misalnya daftar, kirim ulang OTP, dan lupa sandi memakai jatah yang sama,
 * karena ketiganya sama-sama mengirim email.
 *
 * Penyimpanannya di memori, seperti pembatas chat: hilang saat server
 * restart dan tidak berbagi hitungan antar-instance. Cukup untuk sekarang.
 */

const WINDOW_MS = 15 * 60 * 1000;

export const LOGIN_LIMIT = 10;
export const OTP_SEND_LIMIT = 10;
export const OTP_VERIFY_LIMIT = 10;

const MESSAGE =
   "Terlalu banyak percobaan. Coba lagi dalam 15 menit, atau hubungi kami lewat WhatsApp.";

const authLimiter = (limit, options = {}) =>
   rateLimit({
      windowMs: WINDOW_MS,
      limit,
      // req.ip berisi IP asli pengunjung karena app.js memasang trust proxy.
      // ipKeyGenerator mengelompokkan IPv6 per blok, supaya satu orang tidak
      // bisa berganti alamat di dalam bloknya untuk lolos dari batas.
      keyGenerator: (req) => ipKeyGenerator(req.ip),
      standardHeaders: "draft-8",
      legacyHeaders: false,
      // Dilempar sebagai AppError supaya bentuk jawabannya sama dengan error
      // lain dan halaman auth menampilkan pesannya apa adanya.
      handler: (req, res, next) => next(new AppError(MESSAGE, 429)),
      ...options,
   });

// Hanya login yang gagal yang dihitung. Beberapa pembeli di satu jaringan
// (mis. wifi kantor atau jaringan seluler yang berbagi IP) tidak saling
// menghabiskan jatah selama sandinya benar.
export const loginLimiter = authLimiter(LOGIN_LIMIT, {
   skipSuccessfulRequests: true,
});

// Daftar, kirim ulang OTP, dan lupa sandi: semuanya mengirim email.
export const otpSendLimiter = authLimiter(OTP_SEND_LIMIT);

// Verifikasi email, cek kode reset, dan ganti sandi: semuanya menerima kode
// OTP, jadi batas ini yang menahan penebakan kode.
export const otpVerifyLimiter = authLimiter(OTP_VERIFY_LIMIT);
