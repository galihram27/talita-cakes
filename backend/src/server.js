// HARUS baris pertama: memuat .env sebelum modul lain sempat membaca
// process.env (lihat penjelasan di config/env.js).
import "./config/env.js";
import app from "./app.js";
import { cleanupUnverifiedUsers } from "./features/auth/auth.service.js";

/**
 * Titik masuk aplikasi: memuat konfigurasi, menyalakan tugas berkala,
 * lalu membuka port. Perakitan Express-nya sendiri ada di app.js.
 */

const PORT = process.env.PORT || 5000;

// Bersih-bersih akun yang mendaftar tapi tidak pernah verifikasi email, supaya
// alamat email-nya bisa dipakai daftar ulang. Dijalankan di dalam proses ini
// (bukan cron terpisah) karena hostingnya tidak menyediakan penjadwal.
// Error-nya ditangkap & dicatat saja — kegagalan bersih-bersih tidak boleh
// sampai mematikan server.
setInterval(
   () => {
      cleanupUnverifiedUsers().catch((err) =>
         console.error("Cleanup gagal:", err)
      );
   },
   60 * 60 * 1000
); // jalan tiap 1 jam

app.listen(PORT, () => {
   console.log(`Server running on http://localhost:${PORT}`);
});
