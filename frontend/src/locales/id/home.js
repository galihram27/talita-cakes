// ============================================================================
//  TEKS HALAMAN HOME (BAHASA INDONESIA)
// ============================================================================
//
//  Halo! File ini berisi SEMUA tulisan yang tampil di halaman Home (Beranda).
//  Owner bisa mengubah tulisannya sendiri di sini, TANPA perlu paham koding.
//
//  ATURAN PENTING (baca dulu ya):
//  --------------------------------------------------------------------------
//  1. Anda HANYA boleh mengubah tulisan yang ada DI ANTARA TANDA KUTIP "..."
//
//         Contoh — yang boleh diubah cuma bagian bertanda ^^^^ :
//
//         viewMenu: "Lihat Menu",
//                     ^^^^^^^^^   <- ini boleh diganti, mis. "Lihat Katalog"
//
//  2. JANGAN mengubah / menghapus:
//        - kata sebelum tanda titik dua ( viewMenu: )  <- ini "nama" teks
//        - tanda kutip  "  "
//        - tanda koma  ,  di akhir baris
//        - tanda kurung kurawal  {  }
//
//  3. JANGAN memakai tanda kutip " di dalam tulisan Anda.
//        Kalau butuh tanda petik, pakai yang miring:  ‘ ’  atau  ' '
//        Contoh BENAR : "Kue 'spesial' untuk Anda"
//        Contoh SALAH : "Kue "spesial" untuk Anda"   <- ini bikin error
//
//  4. Setelah menyimpan file ini, minta developer untuk menayangkan ulang
//     (deploy) agar perubahan muncul di website.
//
//  Kalau ragu, ubah SATU tulisan dulu, simpan, lalu cek hasilnya.
// ============================================================================

export default {
  // ---- Bagian atas (Hero): judul besar & tombol ----
  hero: {
    title: "Setiap Perayaan Dimulai dari Kue yang Indah",
    subtitle:
      "Kue custom dan dessert premium yang dipanggang segar, dibuat dengan tangan untuk membuat ulang tahun, pernikahan, anniversary, baby shower, wisuda, dan setiap perayaan menjadi tak terlupakan.",
    viewMenu: "Lihat Menu",
    ourGallery: "Galeri Kami",
  },

  // ---- Tiga angka statistik di bawah tombol Hero ----
  stats: {
    years: "12+ Tahun",
    yearsDesc: "Menghadirkan Kebahagiaan Sejak 2012",
    cakes: "3000+ Kue",
    cakesDesc: "Dibuat dengan Penuh Cinta",
    made: "Made by Order",
    madeDesc: "Dipanggang Segar untuk Setiap Pesanan",
  },

  // ---- Bagian "Tipe Kue": judul & subjudul ----
  typesTitle: "Temukan Kue yang Sempurna untuk Perayaan Anda",
  typesSubtitle:
    "Baik Anda mencari favorit siap pesan maupun kreasi yang sepenuhnya custom, kami akan membantu menemukan kue yang pas untuk momen spesial Anda.",

  // ---- Empat kartu tipe kue (tag = judul kartu, desc = keterangan) ----
  types: {
    t1: {
      tag: "Signature Collection",
      desc: "Cocok untuk Anda yang menyukai desain siap pakai dari kami.",
    },
    t2: {
      tag: "Pilih Rasa & Desain",
      desc: "Pilih rasa favorit Anda dengan ukuran kue tetap seperti aslinya.",
    },
    t3: {
      tag: "Pilih Ukuran",
      desc: "Suka desainnya tapi butuh ukuran berbeda?",
    },
    t4: {
      tag: "Kue Full Custom",
      desc: "Buat kue yang benar-benar khas milik Anda.",
    },
  },

  // ---- Label fitur kecil (tanda centang) di dalam kartu tipe kue ----
  features: {
    fixedSize: "Ukuran Tetap",
    fixedFlavor: "Rasa Tetap",
    fixedDecoration: "Dekorasi Tetap",
    chooseSize: "Pilih Ukuran",
    chooseFlavor: "Pilih Rasa",
    simpleDecoration: "Kustomisasi Dekorasi Sederhana",
    customDesign: "Desain Custom",
    uploadInspiration: "Unggah Foto Inspirasi",
  },

  // ---- Bagian "Contoh Kue Kami" (daftar kue favorit) ----
  favoritesTitle: "Contoh Kue Kami",
  favoritesSubtitle: "Beberapa kue yang bisa Anda pesan.",
  allMenu: "Semua menu →",
  loadingFavorites: "Memuat kue favorit...",

  // ---- Bagian "Cara Pesan" (5 langkah) ----
  stepsTitle: "Pesan kue Anda dalam 5 langkah mudah",
  steps: {
    s1: {
      title: "Pilih Kue Anda",
      desc: "Jelajahi menu kami dan pilih kue favorit Anda. Sesuaikan ukuran, rasa, dan desain (jika tersedia), lalu unggah foto inspirasi untuk pesanan custom.",
    },
    s2: {
      title: "Pilih Tanggal",
      desc: "Pilih tanggal ambil atau kirim yang Anda inginkan. Kami sarankan memesan minimal 3 hari sebelumnya. Untuk kue besar atau desain yang sangat custom, sebaiknya pesan lebih awal agar hasilnya maksimal.",
    },
    s3: {
      title: "Kirim Pesanan",
      desc: "Ringkasan pesanan Anda dibuat otomatis. Cukup kirimkan ke kami via WhatsApp untuk melanjutkan proses pemesanan.",
    },
    s4: {
      title: "Konfirmasi Pesanan",
      desc: "Tim kami akan meninjau pesanan Anda, mengonfirmasi ketersediaan, detail pengiriman, dan pembayaran. Setelah semuanya terkonfirmasi, kue Anda akan dipanggang segar dan dibuat khusus untuk hari spesial Anda.",
    },
    s5: {
      title: "Butuh Lebih Cepat?",
      desc: "Beberapa produk mungkin tersedia dengan waktu pemesanan lebih singkat, tergantung jadwal produksi kami. Silakan hubungi kami via WhatsApp, dan kami akan berusaha sebaik mungkin untuk membantu.",
    },
  },

  // ---- Bagian "Kenapa Memilih Kami" ----
  whyTitle: "Kenapa Memilih Talita's Cake",
  why: {
    w1: "Dipanggang Segar Setelah Anda Pesan",
    w2: "Sepenuhnya Bisa Dikustomisasi",
    w3: "Tersedia Layanan Antar",
    w4: "Terpercaya Sejak 2012",
    w5: "Bahan Premium & Halal",
    w6: "Dibuat dengan Cinta",
  },
};
