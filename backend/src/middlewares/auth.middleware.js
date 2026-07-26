import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
   try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
         return res.status(401).json({ message: "Token tidak ditemukan" });
      }

      const token = authHeader.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = decoded; // { userId, role }

      next();
   } catch (err) {
      return res.status(401).json({ message: 'Token tidak valid atau kedaluwarsa' });
   }
};

/**
 * Sama seperti authMiddleware, tapi tidak pernah menolak request.
 * Dipakai di endpoint publik yang tetap ingin tahu SIAPA yang mengakses
 * kalau kebetulan sedang login (mis. pencatatan kunjungan).
 */
export const optionalAuthMiddleware = (req, res, next) => {
   const authHeader = req.headers.authorization;

   if (authHeader?.startsWith("Bearer ")) {
      try {
         req.user = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
      } catch {
         // token busuk / kedaluwarsa -> perlakukan sebagai tamu, jangan blokir
      }
   }

   next();
};
