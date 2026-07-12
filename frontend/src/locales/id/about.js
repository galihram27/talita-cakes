// ============================================================================
//  TEKS HALAMAN "TENTANG KAMI" (ABOUT) — BAHASA INDONESIA
// ============================================================================
//
//  File ini berisi tulisan yang tampil di halaman Tentang Kami.
//  Owner bisa mengubah tulisannya sendiri di sini, TANPA perlu paham koding.
//
//  ATURAN PENTING:
//  --------------------------------------------------------------------------
//  1. HANYA ubah tulisan yang ada DI ANTARA TANDA KUTIP "..."
//
//         Contoh — yang boleh diubah cuma bagian bertanda ^^^^ :
//         store: "Toko",
//                 ^^^^   <- ini boleh diganti, mis. "Toko Kami"
//
//  2. JANGAN mengubah/menghapus:
//        - kata sebelum titik dua ( store: ) <- ini "nama" teks
//        - tanda kutip "  ", tanda koma , , kurung kurawal { }
//        - tulisan {since} <- ini otomatis diganti jadi tahun (mis. 2012)
//
//  3. JANGAN memakai tanda kutip " di dalam tulisan Anda.
//        Kalau butuh tanda petik, pakai yang miring: ' '
//        BENAR : "Kue 'spesial' untuk Anda"
//        SALAH : "Kue "spesial" untuk Anda"   <- ini bikin error
//
//  4. Setelah menyimpan, minta developer menayangkan ulang (deploy).
//     Kalau ragu, ubah SATU tulisan dulu, simpan, lalu cek hasilnya.
// ============================================================================

export default {
  // ---- Judul besar di atas (terdiri dari 3 bagian) ----
  heading1: "Setiap Kue Bermula",
  heading2: "dari sebuah",
  heading3: "Cerita",

  tagline:
    "Setiap perayaan pantas mendapat kue yang sama spesialnya dengan momen itu sendiri.",

  // ---- Paragraf pembuka ({since} = tahun berdiri, jangan dihapus) ----
  intro1:
    "Berdiri sejak {since}, Talita's Cake & Cupcakes bermula dari dapur rumahan kecil dengan satu misi sederhana: membuat kue rumahan yang indah dan mempertemukan orang-orang.",
  intro2:
    "Berbeda dengan kue produksi massal, setiap pesanan dibuat satu per satu — didesain khusus sesuai tema, gaya, dan permintaan spesial Anda.",

  // ---- Tiga angka statistik ----
  stats: {
    years: "Tahun Membuat Kue",
    cakes: "Kue Dibuat dengan Tangan",
    madeNum: "Made by Order",
    made: "Dipanggang Segar untuk Setiap Pesanan",
  },

  // ---- Cerita ----
  story1:
    "Selama bertahun-tahun, kami telah membuat kue dan dessert untuk ulang tahun, pernikahan, anniversary, baby shower, wisuda, acara kantor, dan berbagai perayaan bermakna lainnya. Setiap kreasi dibuat segar sesuai pesanan, disiapkan dengan bahan premium, dan didesain untuk mencerminkan cerita unik setiap pelanggan.",
  story2:
    "Baik Anda mencari kue ulang tahun yang elegan, kue karakter custom, kue pernikahan, brownies premium, cupcakes, cinnamon rolls, atau dessert buatan tangan, tujuan kami selalu sama — menciptakan dessert yang indah dilihat, lezat dinikmati, dan menjadi bagian dari kenangan terbahagia Anda.",
  storyClosing: "Dibuat dengan Cinta sejak {since}. Dibuat Khusus untuk Anda.",

  // ---- Label lokasi toko ----
  store: "Toko",
};
