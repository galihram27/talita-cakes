import prisma from "../../lib/prisma.js";

// Get user by email
export const getUserByEmail = async (email) => {
   return await prisma.user.findUnique({
      where: { email },
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
      },
   });
};

// Update user
export const updateUser = async (id, data) => {
   return await prisma.user.update({
      where: { id },
      data: {
         name: data.name,
         email: data.email,
         password: data.password,
         phone: data.phone,
         role: data.role,
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