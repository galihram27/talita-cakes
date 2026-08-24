/**
 * Error yang memang "direncanakan" — yaitu kegagalan yang sudah kita perkirakan
 * dan punya jawaban jelas untuk user (mis. data tidak ditemukan, tidak punya
 * akses, input tidak valid).
 *
 * Bedanya dengan Error biasa: ia membawa `statusCode`, sehingga error handler
 * global bisa membalas dengan status HTTP yang benar. Error tak terduga (bug)
 * tetap berupa Error biasa dan otomatis dibalas 500.
 *
 * `details` untuk info tambahan yang perlu dibaca frontend, mis. daftar field
 * yang gagal divalidasi, atau kode seperti EMAIL_NOT_VERIFIED.
 * `isOperational` menandai error ini aman ditampilkan ke user.
 *
 * Bisa diimpor dua cara — `import AppError` atau `import { AppError }` —
 * keduanya menunjuk class yang sama.
 */
export class AppError extends Error {
   constructor(message, statusCode = 500, details = null) {
      super(message);
      this.statusCode = statusCode;
      this.details = details;
      this.isOperational = true;
      Error.captureStackTrace(this, this.constructor);
   }
}

export default AppError;
