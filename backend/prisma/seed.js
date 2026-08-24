import bcrypt from "bcrypt";
import prisma from "../src/lib/prisma.js";
import { CURRENT_TERMS_VERSION } from "../src/config/legal.config.js";

/**
 * Membuat akun admin pertama.
 *
 * Diperlukan karena peran admin TIDAK bisa didapat lewat halaman pendaftaran —
 * semua yang mendaftar sendiri selalu jadi user biasa. Jadi akun admin pertama
 * harus dibuatkan dari luar aplikasi, lewat berkas ini.
 *
 * Jalankan dengan: npx prisma db seed
 */
const seedAdmin = async () => {
   const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE } = process.env;

   // Data belum lengkap -> berhenti baik-baik, jangan sampai gagal. Seed ikut
   // terpanggil oleh perintah migrasi Prisma, dan kegagalan di sini akan
   // menghentikan proses migrasi yang sebenarnya tidak ada hubungannya.
   if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_PHONE) {
      console.warn("⚠️  ADMIN_* env vars belum lengkap, skip seed admin.");
      return;
   }

   // Sandi disimpan dalam bentuk hash, sama seperti pendaftaran biasa —
   // supaya bisa dipakai login lewat alur yang sama
   const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

   /**
    * Pakai upsert supaya perintah ini aman dijalankan berulang: akun yang
    * sudah ada diperbarui, bukan bikin duplikat atau melempar error.
    *
    * PERHATIKAN bagian `update` di bawah hanya menyentuh `isVerified` dan
    * `role`. Artinya, kalau akunnya SUDAH ADA, mengubah ADMIN_PASSWORD /
    * ADMIN_NAME / ADMIN_PHONE di .env lalu menjalankan seed lagi TIDAK akan
    * mengubah apa pun. Itu disengaja — supaya menjalankan seed sekali lagi
    * tidak diam-diam menimpa sandi admin yang sedang dipakai.
    *
    * Untuk benar-benar mengganti sandi admin, pakai fitur lupa sandi di
    * aplikasi, atau ubah langsung lewat `npx prisma studio`.
    */
   const admin = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      // Akun sudah ada: cukup pastikan perannya admin & tidak terganjal
      // verifikasi email
      update: {
         isVerified: true,
         role: "ADMIN",
      },
      create: {
         name: ADMIN_NAME,
         email: ADMIN_EMAIL,
         password: hashedPassword,
         phone: ADMIN_PHONE,
         role: "ADMIN",
         // Langsung ditandai terverifikasi, jadi admin tidak perlu menunggu
         // kode OTP hanya untuk bisa masuk pertama kali
         isVerified: true,
         // Diisi agar datanya selengkap akun hasil pendaftaran biasa —
         // kedua kolom ini boleh kosong di skema, tapi membiarkannya kosong
         // membuat akun admin terlihat seperti belum menyetujui ketentuan
         termsAcceptedAt: new Date(),
         termsVersion: CURRENT_TERMS_VERSION,
      },
   });

   console.log(`✅ Admin seeded: ${admin.email}`);
};

seedAdmin()
   .catch((e) => {
      // Keluar dengan kode gagal supaya proses yang memanggil seed ini tahu
      // ada yang salah, bukan mengira semuanya lancar
      console.error(e);
      process.exit(1);
   })
   .finally(async () => {
      // Tutup koneksi database. Tanpa ini prosesnya menggantung dan tidak
      // pernah selesai, karena koneksinya masih terbuka.
      await prisma.$disconnect();
   });
