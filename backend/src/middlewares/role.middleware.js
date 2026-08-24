/**
 * Penjaga endpoint berdasarkan role, mis. `requireRole("ADMIN")`.
 *
 * HARUS dipasang SESUDAH authMiddleware, karena yang dibaca `req.user` —
 * yang baru terisi oleh middleware itu. Kalau urutannya terbalik, semua
 * request akan tertolak sebagai "belum login".
 *
 * Bedanya 401 dan 403 di sini: 401 berarti belum login (silakan login),
 * 403 berarti sudah login tapi memang tidak berhak.
 */
export function requireRole(...allowedRoles) {
   return (req, res, next) => {
      if (!req.user) {
         return res.status(401).json({ message: "Belum login" });
      }

      if (!allowedRoles.includes(req.user.role)) {
         return res
            .status(403)
            .json({ message: "Akses ditolak: hanya admin yang diizinkan" });
      }

      next();
   };
}
