import prisma from "../../lib/prisma.js";

// Get user by email
export const getUserByEmail = async (email) => {
   return await prisma.user.findUnique({
      where: { email },
   });
};

// Get user by id
export const getUserById = async (id) => {
   return await prisma.user.findUnique({
      where: { id },
   });
};

// Create user
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

// Update user — tambahkan termsAcceptedAt & termsVersion supaya re-register
// (accept terms ulang) ikut ter-update
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

// =========================
// CLEANUP (akun yang tidak pernah verifikasi)
// =========================
export const deleteUnverifiedUsersOlderThan = async (cutoffDate) => {
   return prisma.user.deleteMany({
      where: {
         isVerified: false,
         created_at: { lt: cutoffDate }, // field ini snake_case di schema User
      },
   });
};

// Delete user
export const deleteUser = async (id) => {
   return await prisma.user.delete({
      where: { id },
   });
};

// =========================
// REFRESH TOKEN
// =========================
 
// Ambil SEMUA refresh token milik 1 user (karena 1 user bisa punya banyak sesi/device).
// Token disimpan dalam bentuk hash (bcrypt), jadi gak bisa di-query langsung pakai
// token plaintext dari client. Service layer yang akan bcrypt.compare() satu-satu
// dari list ini untuk cari token mana yang match.
export const findRefreshTokensByUserId = async (userId) => {
   return prisma.refreshToken.findMany({
      where: {
         userId,
         expiresAt: { gt: new Date() }, //? sekaligus exclude token yang sudah expired biar gak ikut dicompare
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
 
export const createRefreshToken = async ({ token, userId, expiresAt }) => {
   return prisma.refreshToken.create({
      data: {
         token,
         userId,
         expiresAt,
      },
   });
};
 
// Hapus 1 refresh token spesifik (dipakai saat rotation / logout 1 device)
export const deleteRefreshToken = async (id) => {
   return prisma.refreshToken.delete({
      where: { id },
   });
};
 
// Hapus SEMUA refresh token milik user (dipakai untuk "logout dari semua device")
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

export const createOtpCode = async ({ userId, code, purpose, expiresAt }) => {
   return prisma.otpCode.create({
      data: { userId, code, purpose, expiresAt },
   });
};

export const findLatestOtpByUserAndPurpose = async (userId, purpose) => {
   return prisma.otpCode.findFirst({
      where: { userId, purpose },
      orderBy: { createdAt: "desc" },
   });
};

export const deleteOtpById = async (id) => {
   return prisma.otpCode.delete({ where: { id } });
};

export const deleteOtpsByUserAndPurpose = async (userId, purpose) => {
   return prisma.otpCode.deleteMany({ where: { userId, purpose } });
};

export const markUserVerified = async (userId) => {
   return prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
   });
};

export const updateUserPassword = async (userId, hashedPassword) => {
   return prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
   });
};