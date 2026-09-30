import prisma from "../../lib/prisma.js";

/**
 * Lapisan repository: satu-satunya tempat yang menyentuh database untuk auth.
 *
 * Isinya query Prisma polos — tanpa aturan bisnis, tanpa validasi, tanpa
 * hashing. Semua keputusan (boleh/tidak, error apa yang dilempar) ada di
 * auth.service.js. Tujuannya supaya query gampang dicari & diganti di satu
 * tempat saja.
 */

// =========================
// USER
// =========================

// Cari user by email (dipakai hampir di semua alur: login, register, OTP)
export const getUserByEmail = async (email) => {
   return await prisma.user.findUnique({
      where: { email },
   });
};

// Cari user by id (dipakai getMe, setelah id diambil dari token)
export const getUserById = async (id) => {
   return await prisma.user.findUnique({
      where: { id },
   });
};

// Buat user baru. Password yang masuk ke sini HARUS sudah di-hash oleh service.
export const createUser = async (data) => {
   return await prisma.user.create({
      data: {
         name: data.name,
         email: data.email,
         password: data.password,
         phone: data.phone,
         role: data.role || "USER",
         termsAcceptedAt: data.termsAcceptedAt,
         termsVersion: data.termsVersion,
      },
   });
};

// Update user — termsAcceptedAt & termsVersion ikut diperbarui supaya saat
// re-register (user menyetujui terms lagi) datanya tidak tertinggal versi lama.
export const updateUser = async (id, data) => {
   return await prisma.user.update({
      where: { id },
      data: {
         name: data.name,
         email: data.email,
         password: data.password,
         phone: data.phone,
         role: data.role,
         termsAcceptedAt: data.termsAcceptedAt,
         termsVersion: data.termsVersion,
      },
   });
};

// Hapus user
export const deleteUser = async (id) => {
   return await prisma.user.delete({
      where: { id },
   });
};

// Bersih-bersih akun yang didaftarkan tapi tidak pernah diverifikasi.
// Dipanggil terjadwal lewat cleanupUnverifiedUsers() di service.
export const deleteUnverifiedUsersOlderThan = async (cutoffDate) => {
   return prisma.user.deleteMany({
      where: {
         isVerified: false,
         created_at: { lt: cutoffDate }, // field ini snake_case di schema User
      },
   });
};

// Tandai email user sudah terverifikasi (setelah OTP-nya cocok)
export const markUserVerified = async (userId) => {
   return prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
   });
};

// Simpan password baru (sudah dalam bentuk hash) saat reset password
export const updateUserPassword = async (userId, hashedPassword) => {
   return prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
   });
};

// =========================
// REFRESH TOKEN
// =========================

// Ambil SEMUA refresh token milik 1 user (karena 1 user bisa punya banyak
// sesi/device). Token disimpan dalam bentuk hash (bcrypt), jadi tidak bisa
// di-query langsung pakai token plaintext dari client. Service layer yang akan
// bcrypt.compare() satu per satu dari list ini untuk cari token yang cocok.
export const findRefreshTokensByUserId = async (userId) => {
   return prisma.refreshToken.findMany({
      where: {
         userId,
         // Sekaligus buang token yang sudah expired biar tidak ikut dicompare
         expiresAt: { gt: new Date() },
      },
      include: { user: true },
      orderBy: { createdAt: "desc" },
   });
};

// Cari 1 refresh token spesifik by id (dipakai setelah ketemu match, sebelum delete)
export const findRefreshTokenById = async (id) => {
   return prisma.refreshToken.findUnique({
      where: { id },
      include: { user: true },
   });
};

// Simpan refresh token baru. `token` di sini sudah berupa hash, bukan plaintext.
export const createRefreshToken = async ({ token, userId, expiresAt }) => {
   return prisma.refreshToken.create({
      data: {
         token,
         userId,
         expiresAt,
      },
   });
};

// Hapus 1 refresh token spesifik (dipakai saat rotasi token / logout 1 device)
export const deleteRefreshToken = async (id) => {
   return prisma.refreshToken.delete({
      where: { id },
   });
};

// Hapus SEMUA refresh token milik user (dipakai untuk "logout dari semua device",
// misalnya setelah password diganti)
export const deleteAllRefreshTokensByUserId = async (userId) => {
   return prisma.refreshToken.deleteMany({
      where: { userId },
   });
};

// Bersihkan token yang sudah expired (opsional, bisa dipanggil via cron job)
export const deleteExpiredRefreshTokens = async () => {
   return prisma.refreshToken.deleteMany({
      where: {
         expiresAt: { lt: new Date() },
      },
   });
};

// =========================
// OTP
// =========================

// Simpan OTP baru. `code` sudah dalam bentuk hash — kode aslinya hanya ada
// di email user.
export const createOtpCode = async ({ userId, code, purpose, expiresAt }) => {
   return prisma.otpCode.create({
      data: { userId, code, purpose, expiresAt },
   });
};

// Ambil OTP terbaru untuk 1 user + 1 keperluan (verifikasi email / reset password).
// Yang dipakai selalu yang paling baru; OTP lama dianggap hangus.
export const findLatestOtpByUserAndPurpose = async (userId, purpose) => {
   return prisma.otpCode.findFirst({
      where: { userId, purpose },
      orderBy: { createdAt: "desc" },
   });
};

// Catat satu percobaan untuk sebuah OTP, hanya kalau jatahnya belum habis.
// Pengecekan dan penambahan dilakukan dalam satu query, supaya tebakan yang
// datang bersamaan tidak bisa sama-sama lolos sebelum hitungannya naik.
// Mengembalikan true kalau percobaan masih diizinkan.
export const consumeOtpAttempt = async (id, maxAttempts) => {
   const { count } = await prisma.otpCode.updateMany({
      where: { id, attempts: { lt: maxAttempts } },
      data: { attempts: { increment: 1 } },
   });
   return count > 0;
};

// Kembalikan satu percobaan yang sudah dicatat consumeOtpAttempt. Memakai
// updateMany supaya tidak melempar error kalau OTP-nya sudah terhapus karena
// pembeli meminta kode baru di saat yang sama.
export const releaseOtpAttempt = async (id) => {
   return prisma.otpCode.updateMany({
      where: { id },
      data: { attempts: { decrement: 1 } },
   });
};

// Hapus 1 OTP (setelah berhasil dipakai atau ketahuan sudah kedaluwarsa)
export const deleteOtpById = async (id) => {
   return prisma.otpCode.delete({ where: { id } });
};

// Hapus semua OTP lama sebelum menerbitkan yang baru, supaya hanya ada
// satu OTP aktif per keperluan
export const deleteOtpsByUserAndPurpose = async (userId, purpose) => {
   return prisma.otpCode.deleteMany({ where: { userId, purpose } });
};
