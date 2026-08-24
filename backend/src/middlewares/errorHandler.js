/**
 * Penangkap error terakhir — semua error yang dilempar di route mana pun
 * berakhir di sini, dan ini satu-satunya tempat error diubah jadi response.
 *
 * Aturan pentingnya ada di `isOperational` (lihat utils/appError.js):
 * - Error yang kita lempar sendiri (AppError) dianggap aman, pesannya
 *   diteruskan apa adanya ke user.
 * - Error lain = bug tak terduga. Pesan aslinya SENGAJA tidak dikirim ke user
 *   (bisa membocorkan struktur DB atau isi query), cukup "Internal Server
 *   Error"; detail lengkapnya dicatat ke log server saja.
 *
 * Dua kasus di atas ditangani khusus karena error-nya berasal dari library
 * (body-parser & multer) dan tidak punya statusCode sendiri — tanpa ini
 * keduanya akan terbaca sebagai 500, padahal sebenarnya salah input user.
 *
 * Parameter `next` wajib ditulis meski tidak dipakai: Express mengenali
 * sebuah fungsi sebagai error handler dari jumlah argumennya yang empat.
 */
export const errorHandler = (err, req, res, next) => {
   // body-parser: request body melebihi limit express.json()
   if (err.type === "entity.too.large") {
      return res.status(413).json({
         success: false,
         message: "Ukuran data terlalu besar. Gunakan gambar yang lebih kecil.",
      });
   }

   // multer: file upload melebihi limit fileSize
   if (err.name === "MulterError" && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
         success: false,
         message: "Ukuran gambar maksimal 5MB.",
      });
   }

   const statusCode = err.statusCode || 500;
   const message = err.isOperational ? err.message : "Internal Server Error";

   if (!err.isOperational) {
      console.error(err);
   }

   res.status(statusCode).json({
      success: false,
      message,
      details: err.details || undefined,
   });
};

export default errorHandler;
