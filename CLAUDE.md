# Panduan untuk Claude

Catatan kerja untuk sesi berikutnya. Untuk pemasangan & deploy, baca
[README.md](README.md) — berkas ini khusus berisi hal yang mudah keliru saat
menyunting kode.

## Bahasa

- **Komentar kode: bahasa Indonesia.** Seluruh repo sudah begitu — jangan
  menulis komentar baru dalam bahasa Inggris.
- **Pesan commit: bahasa Inggris**, mengikuti Conventional Commits
  (`fix(auth): ...`, `docs(frontend): ...`). Huruf kecil, imperatif, tanpa
  titik di akhir. Lihat `git log` untuk contoh.
- README & berkas dokumentasi: bahasa Indonesia.

## Gaya penulisan kode — BERBEDA antara backend dan frontend

Ini paling sering salah. Keduanya tidak sama:

| | backend | frontend |
| --- | --- | --- |
| Formatter | `prettier` + `.prettierrc` | tidak ada, ikuti gaya sekitar |
| Indentasi | **3 spasi** | 2 spasi |
| Tanda kutip | ganda `"` | tunggal `'` |
| Titik koma | ya | tidak |
| Lebar baris | 80 | — |

Backend punya `backend/.prettierrc` dengan `tabWidth: 3` — bukan salah ketik.
Setelah menyunting berkas backend, jalankan:

```bash
cd backend && npx prettier --write "src/**/*.js"
```

Frontend **tidak punya** konfigurasi formatter. Jangan menjalankan prettier di
sana — ia akan mengubah ribuan baris tanpa diminta. Cukup ikuti gaya berkas
yang sedang disunting.

Prettier menormalkan akhiran baris ke LF. Git menyimpan LF dan mengembalikan
CRLF saat checkout, jadi peringatan `LF will be replaced by CRLF` itu wajar dan
bukan masalah.

## Isi komentar

Komentar menjelaskan **kenapa**, bukan **apa**. Kalau isinya hanya mengulang
kode, lebih baik dihapus.

```js
// Buruk — mengulang kode
// ambil user by email
const user = await getUserByEmail(email);

// Baik — menjelaskan keputusan
// Email tidak ditemukan dan sandi salah sengaja memakai pesan yang sama,
// supaya tidak bisa dipakai menebak email mana yang punya akun.
```

Pengecualian: `frontend/src/locales/id/about.js` berisi panduan yang ditulis
untuk pemilik toko (non-teknis). **Jangan diringkas** jadi komentar gaya
programmer — itu akan membuatnya tidak bisa dipakai orang yang dituju.

## Aturan yang mudah dilanggar

### Dua berkas yang wajib sinkron

Menambah kategori, rasa, atau ukuran produk berarti menyunting **dua** berkas:

- `backend/src/features/product/product.constant.js`
- `frontend/src/config/productOptions.js`

Kalau hanya salah satu: admin bisa memilih sesuatu yang lalu ditolak server,
atau pilihan yang sah tidak pernah muncul di form.

Hal yang sama berlaku untuk terjemahan — `frontend/src/locales/id.js` dan
`en.js` harus punya kunci yang sama persis (saat ini 656 masing-masing).
Kunci yang hanya ada di `id.js` akan tampil dalam bahasa Inggris, karena
bahasa Inggris dipakai sebagai cadangan.

### Harga tidak pernah dipercaya dari client

Frontend menghitung harga hanya untuk ditampilkan. Yang mengikat selalu
hitungan server (`cart.service.js`, `order.service.js`). Ongkir juga dihitung
ulang server dari koordinat alamat.

Kalau mengubah rumus diskon di satu sisi, ubah juga di sisi lain — kalau tidak,
harga di kartu produk bisa berbeda dari harga di keranjang.

### Masa berlaku token ada di tiga tempat

`utils/token.js`, `auth.service.js` (`REFRESH_TOKEN_TTL_MS`), dan
`utils/cookie.js` (`REFRESH_TOKEN_MAX_AGE`) harus menyebut angka yang sama
(sekarang 7 hari). Kalau tidak sinkron, sesi bisa mati sebelum waktunya atau
cookie tertinggal setelah token tidak berlaku.

## Arsitektur backend

Tiap fitur di `backend/src/features/<nama>/` memakai pembagian lapisan yang
sama. Hormati batasnya:

```
routes       daftar endpoint + middleware
validation   periksa bentuk data (Zod)
controller   HTTP saja — baca request, panggil service, susun jawaban
service      aturan bisnis — di sinilah keputusan diambil
repository   satu-satunya yang menyentuh basis data
```

Controller tidak boleh memanggil repository langsung, dan repository tidak
boleh memuat aturan bisnis. Satu pengecualian yang disengaja:
`product.repository.js` ikut memvalidasi kelengkapan ukuran, karena
pengecekannya baru bisa dilakukan di dalam transaksi agar bisa dibatalkan.

Controller tidak perlu `try/catch` — `asyncHandler` meneruskan error ke
`errorHandler`. Lempar `AppError` untuk kegagalan yang punya jawaban jelas.

## Enam tipe produk

Sumber kerumitan terbesar. Tiap tipe punya cara memilih yang berbeda:

| Tipe | Yang dipilih pembeli |
| --- | --- |
| TYPE1 | tidak ada — semuanya sudah ditetapkan |
| TYPE2 | rasa + acuan desain |
| TYPE3 | bentuk & ukuran |
| TYPE4 | bentuk, ukuran, rasa, acuan desain |
| TYPE5 | tergantung kategori: ukuran bernama (roti), pilihan ukuran (Basque), filling & topping (Cinrolls), atau tidak ada |
| TYPE6 | isi box + rasa; goodiebag dijual per paket |

Catatan yang mudah menjebak: pada TYPE6, kolom `size` berarti **jumlah cupcake
dalam box**, bukan diameter kue.

## Menjalankan & memverifikasi

Repo ini **tidak punya automated test**. Verifikasi dilakukan manual:

```bash
# Backend — periksa sintaks & semua modul bisa dimuat
cd backend
for f in src/**/*.js; do node --check "$f"; done
npx prettier --check "src/**/*.js"

# Frontend — build penuh adalah pemeriksaan paling meyakinkan
cd frontend
npx vite build --mode development --logLevel error
```

Build frontend menjalankan pra-render seluruh halaman publik, jadi kesalahan
di komponen mana pun akan ketahuan di situ.

Untuk menguji backend sungguhan, jalankan `npm run dev` lalu panggil
endpoint-nya. `.env` sudah terisi di mesin ini.

### Memastikan hanya komentar yang berubah

Setelah menyunting komentar, buktikan kodenya tidak ikut berubah:

```bash
git diff -w --ignore-blank-lines -- <berkas> \
  | grep "^[+-][^+-]" \
  | grep -vE "^[+-]\s*(//|/\*|\*|<!--)"
```

Kalau keluarannya kosong, berarti aman. Hati-hati: penyaring berbasis pola
seperti ini melewatkan komentar ekor di belakang baris kode, dan pada berkas
`.vue` apostrof dalam teks biasa (mis. "Talita's Cake") bisa mengacaukan
penelusuran string. Untuk berkas Vue, periksa manual.

## Hal yang sudah diketahui

1. **Fitur ulasan Google menganggur.** Backend lengkap (endpoint, cache 6 jam,
   kunci API), tapi `components/common/GoogleReviews.vue` memakai ulasan yang
   ditulis langsung di berkasnya. `services/review.service.js` tidak dipanggil
   siapa pun. Belum diputuskan: disambungkan atau dibuang.

2. **Komentar keliru** di `backend/src/features/product/product.service.js`
   menyebut "Mozzarella Sausage Rolls" sebagai contoh kategori tanpa
   sub-kategori — padahal ia sub-kategori dari Bread.

3. **Akun admin** tidak bisa dibuat lewat pendaftaran. Pakai
   `npx prisma db seed` dengan `ADMIN_*` di `.env`. Menjalankan ulang seed
   **tidak** memperbarui sandi akun yang sudah ada — itu disengaja.

## Git

- Jangan commit kecuali diminta.
- Kalau diminta commit, periksa `git status` dulu: working tree sering berisi
  perubahan milik pengguna yang belum tentu ingin ikut. Stage per path
  (`git add <path>`), jangan `git add -A`.
- Perubahan besar sebaiknya dipecah: perbaikan perilaku terpisah dari
  perapian komentar, supaya `git log` tetap bisa menuntun saat ada masalah.
