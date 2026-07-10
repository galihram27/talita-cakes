# Panduan Mengubah Teks Halaman Home

Panduan singkat untuk **owner** yang ingin mengganti tulisan di halaman Home
(Beranda) sendiri, tanpa perlu paham koding.

---

## File yang diedit

Hanya **satu file**:

```
frontend/src/locales/id/home.js
```

Buka file itu dengan aplikasi teks apa saja (Notepad, VS Code, dll).

---

## Cara mengubah

Setiap baris teks bentuknya seperti ini:

```
viewMenu: "Lihat Menu",
```

- Kata di depan titik dua (`viewMenu`) adalah **nama** teks — **JANGAN diubah**.
- Tulisan **di antara tanda kutip** (`"Lihat Menu"`) adalah yang tampil di web —
  **ini yang boleh Anda ganti**.

Contoh mengganti tombol "Lihat Menu" menjadi "Lihat Katalog":

```
viewMenu: "Lihat Katalog",
```

Selesai. Simpan file.

---

## Yang BOLEH & TIDAK BOLEH

✅ **Boleh:**
- Mengganti tulisan di antara tanda kutip `"..."`.

❌ **Jangan:**
- Menghapus atau mengubah nama sebelum titik dua (`viewMenu:`).
- Menghapus tanda kutip `"`, tanda koma `,`, atau kurung kurawal `{ }`.
- Memakai tanda kutip lurus `"` **di dalam** tulisan Anda.
  - Kalau butuh tanda petik, pakai yang miring: `‘ ’` atau `' '`.
  - Benar: `"Kue 'spesial' untuk Anda"`
  - Salah: `"Kue "spesial" untuk Anda"` ← ini membuat web error.

---

## Setelah mengedit

1. **Simpan** file.
2. Minta developer untuk **menayangkan ulang (deploy)** agar perubahan
   muncul di website.

> Tips: ubah **satu** tulisan dulu, simpan, lalu minta cek hasilnya.
> Kalau sudah yakin caranya, baru ubah banyak sekaligus.

---

## Catatan teknis (untuk developer)

Teks Home dibaca dari `locales/id/home.js` dan menimpa bagian `home`
di `locales/id.js` lewat penggabungan di `src/i18n/index.js`.
File `id.js` sengaja TIDAK diubah; kalau ingin memindahkan bagian lain
(menu, checkout, dll.) ke pola yang sama, tambahkan file serupa dan
gabungkan di `i18n/index.js`.
