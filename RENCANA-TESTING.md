# Rencana Pemasangan Testing Otomatis (Vitest)

Peta jalan memasang testing otomatis di backend dan frontend, dibuat supaya
urutan pengerjaan jelas dan tidak ada langkah yang terlewat. Tahap yang sudah
selesai tetap dibiarkan di sini beserta catatan bagian mana yang berbeda dari
rencana awal.

Sasarannya: bagian yang paling mahal kalau rusak (harga, diskon, ongkir,
validasi, login) diperiksa otomatis dengan satu perintah `npm test`. Rencana
ini dikerjakan **sebelum** [RENCANA-TYPESCRIPT.md](RENCANA-TYPESCRIPT.md),
supaya setiap commit konversi bisa dibuktikan tidak mengubah perilaku.

## Progres

| Tahap | Status |
| --- | --- |
| 0. Persiapan | Selesai |
| 1. Backend: pasang Vitest | Selesai |
| 2. Backend: fungsi murni | Selesai |
| 3. Backend: skema validasi | Selesai |
| 4. Backend: service dengan repository tiruan | Selesai (lihat catatan di Tahap 4) |
| 5. Frontend: pasang Vitest | Selesai |
| 6. Frontend: rumus harga, terjemahan, utilitas | Selesai (lihat catatan di Tahap 6) |
| 7. Penutup: dokumentasi | Belum |
| 8. (Opsional) Test otomatis di GitHub | Belum |

---

## 1. Keputusan yang sudah diambil

| Hal | Pilihan | Alasan |
| --- | --- | --- |
| Alat test | Vitest | Proyek memakai `import`/`export` (`"type": "module"`). Vitest langsung mendukungnya, sedangkan dukungan Jest masih eksperimen. Vitest juga langsung bisa membaca `.ts`, jadi tidak perlu diganti saat konversi TypeScript. Cara menulis test-nya sama dengan Jest (`describe`, `it`, `expect`) |
| Jenis test | **Unit test**: memanggil satu fungsi dan memeriksa hasilnya | Cepat (hitungan detik), tidak butuh basis data, tidak butuh server menyala |
| Basis data | **Tidak disentuh sama sekali** | Repository diganti tiruan (`vi.mock`). Test yang menyentuh basis data sungguhan butuh basis data terpisah khusus test, dan itu pekerjaan tersendiri |
| Layanan luar (Groq, HERE, Cloudinary, Resend) | Selalu ditiru | Test tidak boleh bergantung pada internet, kunci API, atau kuota gratis |
| Letak berkas test | Di sebelah berkas yang dites, akhiran `.test.js` | `cart.service.js` dan `cart.service.test.js` berada di folder yang sama, jadi mudah melihat berkas mana yang belum punya test |
| Cakupan | **Terbatas** pada bagian yang tercantum di rencana ini | Tujuannya melindungi konversi TypeScript, bukan menguji 165 berkas. Menguji semuanya akan menunda konversi berbulan-bulan |
| Komponen Vue | Tidak dites di putaran ini | Logika yang penting (harga) dipindah ke berkas `.js` biasa dulu, lalu berkas itu yang dites. Lihat Tahap 6 |

### Test mencatat perilaku yang ada sekarang

Test di rencana ini ditulis untuk **mencatat apa yang dilakukan kode saat
ini**, bukan apa yang seharusnya dilakukan. Tujuannya supaya perubahan apa pun
langsung ketahuan.

Kalau saat menulis test ditemukan perilaku yang terlihat salah, **jangan
diperbaiki di commit yang sama**. Tulis test sesuai perilaku sekarang, catat
temuannya di bagian "Temuan" di bawah, lalu tanyakan ke pemilik toko. Kalau
memang salah, perbaikannya masuk commit `fix(...)` tersendiri, dan test-nya
ikut diubah di commit itu.

### Kapan dikerjakan

1. Selesaikan Tahap 8 chatbot (deploy), gabungkan `feat/chatbot` ke `main`.
2. Buat branch `test/vitest` dari `main`, kerjakan rencana ini.
3. Gabungkan ke `main`, lalu mulai [RENCANA-TYPESCRIPT.md](RENCANA-TYPESCRIPT.md).

---

## 2. Aturan kerja

- **Satu berkas test untuk satu berkas sumber.** Nama berkasnya sama,
  ditambah `.test` sebelum `.js`.
- **Satu `it(...)` memeriksa satu hal**, dengan nama yang menjelaskan
  kejadiannya dalam bahasa Indonesia:
  `it("menolak jarak lebih dari 25 km")`, bukan `it("test 3")`.
- **Pakai angka nyata dari toko.** Contoh harga dan diskon diambil dari produk
  yang benar-benar dijual, supaya test mudah dicocokkan dengan halaman menu.
- **Test tidak boleh bergantung pada tanggal hari ini.** Fungsi yang
  membaca tanggal (mis. batas H+3) dites dengan waktu yang ditetapkan
  (`vi.setSystemTime`).
- **Test tidak boleh bergantung pada `.env`.** Nilai yang dibutuhkan (mis.
  `JWT_SECRET`) diisi di dalam test dengan `vi.stubEnv`.
- **Mengubah kode sumber supaya bisa dites dipisahkan dari commit test.**
  Contohnya memindahkan rumus harga dari komponen ke berkas sendiri (Tahap 6).
  Commit pemindahan memakai tipe `refactor(...)`, commit test memakai
  `test(...)`.
- **Gaya penulisan mengikuti `CLAUDE.md`.** Berkas test di backend ikut
  diformat prettier (3 spasi). Berkas test di frontend 2 spasi, tanpa titik
  koma, dan tidak diformat prettier.

Contoh pesan commit:

```
chore(backend): add vitest
test(order): cover delivery fee brackets
refactor(frontend): move discount formula to utils/price.js
test(frontend): cover discount formula
```

---

## Tahap 0 — Persiapan

- [x] Pastikan working tree bersih, buat branch `test/vitest`
- [x] Pastikan build frontend dan backend lolos sebelum mulai
- [ ] Catat beberapa contoh nyata dari situs, untuk dipakai sebagai angka di
      test:
  - harga dan diskon beberapa produk, minimal satu dari setiap tipe
    (TYPE1 sampai TYPE6)
  - ongkir ke beberapa alamat dengan jarak berbeda

---

## Tahap 1 — Backend: pasang Vitest

Tujuan: `npm test` berjalan di backend, dengan satu test sederhana yang lolos.

- [x] Pasang `vitest` sebagai dependensi pengembangan
- [x] Tambahkan script di `backend/package.json`:

      "test": "vitest run",
      "test:watch": "vitest"

      `vitest run` menjalankan semua test sekali lalu selesai.
      `vitest` tanpa `run` terus berjalan dan mengulang test setiap kali
      berkas disimpan, berguna saat sedang menulis test.

- [x] Buat `backend/vitest.config.js`:

      ```js
      import { defineConfig } from "vitest/config";

      export default defineConfig({
         test: {
            environment: "node",
            include: ["src/**/*.test.js"],
            setupFiles: ["./vitest.setup.js"],
         },
      });
      ```

- [x] Buat `backend/vitest.setup.js` yang meniru `src/lib/prisma.js` secara
      menyeluruh. Setiap pemanggilan ke basis data langsung melempar error
      dengan pesan jelas ("test tidak boleh menyentuh basis data"). Dengan
      begitu, test yang lupa meniru repository langsung gagal, bukan diam-diam
      mencoba terhubung ke basis data produksi
- [x] Tulis test pertama untuk `applyDiscount` di `cart.service.js`, jalankan
      `npm test`, pastikan lolos
- [x] Pastikan perintah prettier di `CLAUDE.md` (`"src/**/*.js"`) ikut
      memformat berkas test. Polanya sudah mencakup `*.test.js`, jadi tidak
      perlu diubah

Commit: `chore(backend): add vitest`

---

## Tahap 2 — Backend: fungsi murni

Tujuan: menguji fungsi yang hanya menerima masukan dan mengembalikan hasil,
tanpa basis data. Ini bagian yang paling mudah dan paling cepat ditulis.

| Berkas | Fungsi | Yang diperiksa |
| --- | --- | --- |
| `features/cart/cart.service.js` | `applyDiscount` | Tanpa diskon, diskon 10%, diskon 0, diskon `null`, harga dalam bentuk teks (`"150000"`), pembulatan 2 desimal |
| `features/order/order.helper.js` | `calculateDeliveryFee` | Setiap batas tarif: 0 km, 4,9 km, 5 km, 10 km, 10,5 km, 11 km, 15 km, 20 km, 25 km, 25,1 km |
| `features/order/order.helper.js` | `isRequestCakeDateValid` | H+2 ditolak, H+3 diterima, pesan jam 23:59 tetap dihitung per tanggal |
| `utils/distance.js` | `calculateDistanceKm` | Dua titik sama = 0, satu pasang koordinat dengan jarak yang sudah diketahui |
| `utils/distance.js` | `getDeliveryDistanceKm` | Kalau HERE gagal (`fetch` ditiru), jatuh ke jarak garis lurus |
| `features/product/product.helper.js` | semua fungsi | Rentang ukuran bulat dan kotak, ukuran manual yang sah, deteksi varian ganda, kelengkapan ukuran |
| `features/product/product.constant.js` | fungsi `is...` / `...For...` | Setiap kategori dan sub-kategori memberi jawaban yang benar |
| `utils/token.js` | `generateAccessToken`, `generateRefreshToken` | Isi token benar, access token berlaku 1 jam, refresh token berlaku **7 hari**, keduanya memakai secret yang berbeda |
| `utils/otp.js` | `generateOtpCode`, `compareOtpCode` | Panjang 6 digit, hanya angka, kode yang benar cocok dengan hash-nya |
| `lib/cache.js` | semua fungsi | Nilai tersimpan, kedaluwarsa setelah waktunya (`vi.useFakeTimers`), hapus berdasarkan awalan |
| `features/analytics/analytics.visitor.js` | `isBotUserAgent`, `fingerprintVisitorId` | Peramban sungguhan (Chrome, Safari, peramban di dalam Instagram) dihitung; bot, pratinjau tautan, curl, dan user-agent kosong tidak. ID cadangan stabil dan tidak memuat IP asli. *Ditambahkan di luar rencana awal* |

Catatan khusus:

- **`calculateDeliveryFee` dan jarak 10,5 km.** Komentar di kode menyebut
  tarif "11–15 km", tapi kodenya memakai `<= 10` lalu `<= 15`, jadi 10,5 km
  masuk tarif Rp55.000. Test ditulis sesuai kode (Rp55.000). Tanyakan ke
  pemilik toko apakah itu memang yang dimaksud, lalu catat jawabannya di
  bagian "Temuan".
- **Masa berlaku token.** Test untuk refresh token 7 hari juga menjaga aturan
  "tiga tempat yang harus sinkron" di `CLAUDE.md`. Tambahkan test yang
  memeriksa `REFRESH_TOKEN_MAX_AGE` di `utils/cookie.js` dan
  `REFRESH_TOKEN_TTL_MS` di `auth.service.js` sama dengan 7 hari. Keduanya
  saat ini tidak diekspor, jadi perlu diekspor dulu supaya bisa diperiksa.
  Pengeksporannya masuk commit terpisah.

Commit: satu commit per berkas sumber.

---

## Tahap 3 — Backend: skema validasi

Tujuan: memastikan data yang sah diterima dan data rusak ditolak. Skema Zod
bisa dites langsung dengan `schema.safeParse(data)`, tanpa menyalakan server.

| Berkas | Yang diperiksa |
| --- | --- |
| `features/product/product.validation.js` | Satu contoh data sah untuk **setiap** tipe (TYPE1 sampai TYPE6). Lalu data rusak: tipe tidak dikenal, harga negatif, kategori yang tidak ada di `product.constant.js`, ukuran tidak lengkap |
| `features/order/order.validation.js` | `checkoutSchema` dan `previewSchema`: data sah diterima; tanpa alamat, tanpa koordinat, dan tanggal kurang dari H+3 ditolak |
| `features/cart/cart.validation.js` | Jumlah 0 dan negatif ditolak, tipe data salah ditolak |
| `features/auth/auth.validation.js` | Email tidak sah, sandi terlalu pendek, kode OTP bukan 6 digit ditolak |
| `middlewares/validate.js` | Data rusak menghasilkan `AppError` status 422. Data sah ditulis balik ke `req` dalam bentuk yang sudah dikonversi (teks `"12"` jadi angka 12). Untuk `query`, isinya disalin ke objek yang sama (aturan Express 5) |

`product.validation.js` (916 baris) adalah berkas terbesar di backend dan
paling berisiko saat konversi TypeScript. Test-nya sebaiknya paling lengkap.

Commit: satu commit per berkas sumber.

---

## Tahap 4 — Backend: service dengan repository tiruan

Tujuan: menguji aturan bisnis di service. Repository diganti tiruan
(`vi.mock("./cart.repository.js")`), jadi test menentukan sendiri data apa
yang "dikembalikan basis data".

### `cart.service.js`: harga per tipe produk

Ini bagian paling penting di seluruh rencana. `addItemToCart` dites untuk
setiap tipe, dengan memeriksa harga yang disimpan ke repository:

| Tipe | Skenario |
| --- | --- |
| TYPE1 | Harga dasar, harga dengan diskon |
| TYPE2 | Rasa yang sah diterima, rasa yang tidak ada ditolak |
| TYPE3 | Bentuk & ukuran yang ada diterima, varian milik produk lain ditolak |
| TYPE4 | Bentuk, ukuran, rasa, acuan desain |
| TYPE5 | Roti dengan ukuran bernama, Basque dengan pilihan ukuran, Cinrolls dengan filling & topping (harga dari kombinasi, topping lebih dari 3 ditolak) |
| TYPE6 | Box cupcake (`size` = jumlah cupcake), goodiebag dengan jumlah minimum |

Tambahan: `updateItemQuantity` dan `removeItem` menolak barang milik pengguna
lain.

### `order.service.js`: checkout

`getDeliveryDistanceKm` ditiru, supaya jarak bisa ditentukan sendiri tanpa
memanggil HERE.

- [x] `previewCheckout`: subtotal + ongkir benar untuk beberapa jarak
- [x] Jarak lebih dari 25 km ditolak dengan pesan yang jelas
- [x] Keranjang kosong ditolak
- [ ] Harga dihitung ulang dari data produk, bukan dari harga yang tersimpan
      di keranjang atau dikirim client

      **Berbeda dari rencana.** Checkout memakai harga yang tersimpan di
      keranjang, yaitu harga yang dihitung server saat barang dimasukkan.
      Harga dari client tetap diabaikan. Test mencatat perilaku ini; lihat
      "Temuan".

### `auth.service.js`: login

- [x] Email tidak terdaftar dan sandi salah menghasilkan **pesan yang sama
      persis**. Ini aturan keamanan yang disebut di komentar kode, dan mudah
      rusak tanpa disadari
- [x] Akun yang belum verifikasi email tidak bisa login

### `analytics.service.js`: angka pengunjung di dashboard

*Ditambahkan di luar rencana awal.* Kalau rusak, pembeli tidak dirugikan,
tapi angka yang dibaca pemilik toko jadi keliru.

- [x] Pengunjung yang sama hanya ditulis sekali per hari, dan dicatat lagi
      keesokan harinya
- [x] Satu IP maksimal mendaftarkan 30 pengunjung baru per hari; IP lain dan
      kunjungan ulang tidak terpengaruh; jatahnya kembali penuh keesokan hari
- [x] Kalau penulisan ke basis data gagal, kunjungan yang sama boleh dicoba lagi
- [x] Rentang tanggal statistik: 00:00 sampai 23:59:59.999, satu tanggal
      saja ditolak, tanggal awal setelah tanggal akhir ditolak
- [x] Hasil harian dan bulanan disamakan menjadi `{ date, count }`

### `gallery.service.js` & `gallery.validation.js`: galeri foto

*Ditambahkan di luar rencana awal.* Hanya admin yang bisa mengubah galeri,
tapi kesalahan cache membuat foto baru diam-diam tidak tampil.

- [x] Tags dari teks `"a, b"` atau daftar dirapikan jadi daftar bersih; saat
      update, tags yang tidak dikirim tidak tertimpa
- [x] Maksimal 100 foto per halaman, halaman di bawah 1 dianggap halaman 1
- [x] Menambah, mengubah, dan menghapus foto membersihkan cache dan memicu
      build ulang situs
- [x] Foto yang tidak ada dijawab 404 dan tidak memicu build ulang
- [x] Validasi: URL gambar sah, update minimal satu field, `limit` maksimal 100

### `product.service.js`: kelola katalog oleh admin

*Ditambahkan di luar rencana awal.* `settings`, `review`, dan `upload`
sengaja tidak dites (keputusan pemilik repo).

- [x] Membuat produk tiap tipe: bentuk varian yang disimpan benar (Bread jadi
      dimensi tetap, Basque bulat, cupcake `size` = isi box, goodiebag tanpa
      isi box); rasa, sub-kategori, filling & topping hanya disimpan untuk
      tipe/kategori yang memakainya
- [x] Update: 404, data rusak ditolak tanpa menulis, tipe tidak bisa diganti,
      mengubah nama tidak menyentuh diskon, foto baru ikut mengganti cover
- [x] Update membersihkan data yang tidak lagi relevan: pindah dari Cinrolls
      mengosongkan filling & topping, pindah kategori cupcake mengosongkan rasa
- [x] Tambah, ubah, hapus membersihkan cache dan memicu build ulang situs
- [x] Pencarian tanpa kata kunci ditolak

### `chat.tools.js`: harga yang disebut asisten

- [x] Harga dari tool katalog sama dengan hasil `applyDiscount` untuk produk
      yang sama. Asisten tidak boleh menyebut harga yang berbeda dari keranjang

Commit: satu commit per service.

---

## Tahap 5 — Frontend: pasang Vitest

Tujuan: `npm test` berjalan di frontend.

- [x] Pasang `vitest` sebagai dependensi pengembangan
- [x] Tambahkan script `"test": "vitest run"` dan `"test:watch": "vitest"`
- [x] Tambahkan bagian `test` di `vite.config.js`:

      ```js
      test: {
        environment: 'node',
        include: ['src/**/*.test.js'],
      },
      ```

      Vitest membaca `vite.config.js` yang sudah ada, jadi alias `@/` langsung
      berlaku di test tanpa pengaturan tambahan.

- [x] Pastikan test **tidak** memicu pengambilan daftar produk dari backend
      (`fetchProductRoutes`). Fungsi itu hanya dipanggil saat build pra-render,
      tapi tetap perlu dicek dengan menjalankan `npm test` saat backend mati

      Dicek dengan alamat API yang tidak bisa dijangkau (backend lokal sedang
      menyala saat itu): tidak ada pesan `[ssg]`, jadi fungsinya tidak
      terpanggil.

- [x] Jalankan build frontend, pastikan bagian `test` tidak mengganggu build

Commit: `chore(frontend): add vitest`

---

## Tahap 6 — Frontend: rumus harga, terjemahan, utilitas

### Rumus diskon: pindahkan dulu, baru dites

Rumus diskon di frontend saat ini **ditulis ulang di 10 tempat**:

```
components/product/ProductCard.vue
components/product/ProductType1Detail.vue ... ProductType6Detail.vue
components/product/ProductBoxPicker.vue
components/product/ProductVariantPicker.vue
views/admin/AdminProductsView.vue
```

Isinya sama: `Math.round((price - (price * discount) / 100) * 100) / 100`.
Kalau salah satunya berubah, harga di kartu produk bisa berbeda dari harga di
halaman detail tanpa ketahuan.

- [x] Buat `frontend/src/utils/price.js` berisi satu fungsi
      `applyDiscount(price, discount)` dengan rumus yang **sama persis**
- [x] Ganti kesepuluh tempat itu dengan memanggil fungsi tersebut.
      Commit sendiri: `refactor(frontend): move discount formula to utils/price.js`

      **Berbeda dari rencana.** Ternyata ada tempat kesebelas,
      `config/seo.js` (`lowestPrice`, harga untuk mesin pencari), dengan rumus
      yang sama; ikut diganti. `ProductCard.vue` dan `AdminProductsView.vue`
      tetap melewati rumus kalau diskon 0, seperti sebelumnya.
      `views/MenuView.vue` (`sortPriceOf`) sengaja dibiarkan: rumusnya tanpa
      pembulatan dan hanya dipakai untuk mengurutkan, tidak ditampilkan.

- [ ] Jalankan build frontend dan cek manual harga di menu & detail produk.
      Angkanya harus sama dengan catatan dari Tahap 0

      Build sudah lolos. Pengecekan harga di peramban **belum** dilakukan.
      Karena semua produk saat ini diskon 0, harga yang tampil tidak melewati
      bagian rumus yang berubah; risikonya kecil tapi tetap perlu dilihat.

- [x] Tulis `price.test.js` memakai **contoh angka yang sama** dengan test
      `applyDiscount` di backend. Dengan begitu, kalau rumus di salah satu
      sisi berubah, test di sisi itu gagal. Aturan "ubah rumus diskon di kedua
      sisi" di `CLAUDE.md` jadi diperiksa otomatis

### Terjemahan: kunci `id` dan `en` harus sama

- [x] Tulis `locales/locales.test.js` yang membandingkan seluruh kunci
      `id.js` dan `en.js`, termasuk kunci bertingkat. Kalau berbeda, test gagal
      dan menampilkan kunci yang hilang di masing-masing berkas

      Ditambah: `locales/id/about.js` dibandingkan dengan bagian `about` di
      `en.js`, karena berkas itulah yang benar-benar tampil (menimpa `id.js`,
      lihat `i18n/index.js`). Juga diperiksa tidak ada teks kosong.

Test ini menggantikan penghitungan manual "681 kunci" di `CLAUDE.md`.

### Pilihan produk: backend dan frontend harus sama

`backend/src/features/product/product.constant.js` tidak meng-import apa pun,
jadi bisa di-import langsung dari test frontend dengan path relatif.

- [x] Tulis `config/productOptions.test.js` yang membandingkan daftar
      kategori, sub-kategori, rasa, dan ukuran roti di kedua berkas

      Rasa TYPE2 & TYPE4 di frontend ada di `config/constants.js`, jadi ikut
      dibandingkan dari sana. Baris `config/productOptions.js` di tabel
      "Utilitas lain" digabung ke berkas test ini: setiap fungsi `is...` /
      `...For...` dicoba dengan semua kategori & sub-kategori plus nilai yang
      tidak dikenal, dan jawabannya harus sama dengan backend.

Dengan test ini, aturan "dua berkas wajib sinkron" di `CLAUDE.md` diperiksa
otomatis.

### Utilitas lain

| Berkas | Yang diperiksa |
| --- | --- |
| `utils/formatCurrency.js` | `150000` jadi `Rp150.000`, angka 0, angka berdesimal |
| `utils/chatMarkdown.js` | Tebal dan tautan diubah jadi HTML. **Tag `<script>` dan atribut `onerror` di jawaban asisten di-escape**, tidak dijalankan. Tautan `javascript:` tidak menjadi tautan. `[Nama](#produk)` menjadi tautan produk (`data-product-name`, tanpa `target="_blank"`), dan tanda kutip di nama tetap ter-escape di atribut; alamat relatif (`/admin`, `//evil.com`, `/product/<uuid>`) hanya tampil sebagai teks labelnya |
| `utils/cloudinaryImage.js` | URL Cloudinary diberi parameter ukuran, URL lain dibiarkan |
| `config/productOptions.js` | Fungsi `is...` / `...For...` memberi jawaban yang sama dengan versi backend-nya |

Test `chatMarkdown.js` adalah test keamanan. Teks jawaban asisten berasal dari
model AI, dan tidak boleh ada jalan bagi teks itu untuk menjalankan kode di
peramban pembeli.

Semua baris di tabel di atas sudah dites.

Cara membuktikan test bekerja sudah dicoba untuk tiap berkas: rumus diskon
`/ 100` jadi `/ 10`, satu kunci `en.js` diganti nama, satu rasa dan satu isi
box di `product.constant.js` diubah, escape `<` di `chatMarkdown.js` dihapus,
dan alamat relatif dijadikan tautan. Semuanya membuat test gagal.

**Saran di luar rencana:** tarif ongkir juga disalin di frontend
(`DELIVERY_FEE_TIERS` di `config/constants.js`, untuk dibaca pembeli). Belum
ada test yang mencocokkannya dengan `calculateDeliveryFee` di backend.

Commit: satu commit per berkas sumber.

---

## Tahap 7 — Penutup: dokumentasi

- [ ] Perbarui `CLAUDE.md`:
  - hapus kalimat "Repo ini **tidak punya automated test**"
  - tambahkan `npm test` di backend dan frontend ke bagian "Menjalankan &
    memverifikasi"
  - aturan sinkron `id`/`en`, `product.constant`/`productOptions`, dan rumus
    diskon: sebutkan bahwa sekarang diperiksa oleh test
  - letak dan penamaan berkas test
- [ ] Perbarui `README.md`: cara menjalankan test
- [ ] Perbarui [RENCANA-TYPESCRIPT.md](RENCANA-TYPESCRIPT.md):
  - bagian "Verifikasi": tambahkan `npm test` sebagai pemeriksaan wajib di
    setiap commit
  - `backend/tsconfig.json` perlu `"exclude": ["src/**/*.test.ts"]`, supaya
    berkas test tidak ikut dikompilasi ke `dist/`
  - `include` di `vitest.config.js` dan `vite.config.js` diganti menjadi
    `*.test.{js,ts}`

---

## Tahap 8 — (Opsional) Test otomatis di GitHub

Kalau repo disimpan di GitHub, test bisa dijalankan otomatis setiap kali ada
push atau pull request, lewat GitHub Actions.

- [ ] Buat `.github/workflows/test.yml` yang menjalankan `npm ci` dan
      `npm test` di folder `backend` dan `frontend`
- [ ] Pastikan tidak ada test yang membutuhkan rahasia (kunci API, `.env`).
      Kalau Tahap 1 sampai 6 mengikuti aturan kerja, tidak ada

Hasilnya: pull request yang merusak test langsung terlihat di GitHub sebelum
digabung ke `main`.

---

## Daftar berkas yang akan disentuh

**Baru**

```
backend/vitest.config.js
backend/vitest.setup.js
backend/src/**/*.test.js              berkas test backend
frontend/src/utils/price.js           rumus diskon yang dipindah
frontend/src/**/*.test.js             berkas test frontend
.github/workflows/test.yml            opsional, Tahap 8
```

**Disunting**

```
backend/package.json                  vitest + script test
frontend/package.json                 vitest + script test
frontend/vite.config.js               bagian test
frontend/src/components/product/*     pakai utils/price.js (9 berkas)
frontend/src/views/admin/AdminProductsView.vue   pakai utils/price.js
backend/src/features/auth/auth.service.js         ekspor REFRESH_TOKEN_TTL_MS
backend/src/utils/cookie.js                       ekspor REFRESH_TOKEN_MAX_AGE
CLAUDE.md
README.md
RENCANA-TYPESCRIPT.md
```

---

## Verifikasi

```bash
# Backend
cd backend
npm test
npx prettier --check "src/**/*.js"

# Frontend
cd frontend
npm test
npx vite build --mode development --logLevel error
```

Cara membuktikan test benar-benar bekerja: setelah menulis test untuk suatu
fungsi, ubah sedikit fungsinya dengan sengaja (misalnya ganti `/ 100` menjadi
`/ 10` di rumus diskon), lalu jalankan `npm test`. Test **harus** gagal.
Kembalikan perubahannya. Test yang tetap lolos saat kodenya dirusak tidak
melindungi apa pun.

---

## Temuan

Diisi selama pengerjaan. Setiap perilaku yang terlihat salah dicatat di sini
beserta keputusannya.

| Temuan | Keputusan |
| --- | --- |
| `calculateDeliveryFee`: 10,5 km masuk tarif Rp55.000, padahal komentar menyebut "11–15 km" | Belum ditanyakan |
| `confirmCheckout`: pesanan PICKUP dengan `recipientType: "FOR_SOMEONE_ELSE"` dari client tetap menyimpan nama penerima, padahal komentar menyebut data penerima tidak disimpan untuk PICKUP | Belum diputuskan |
| `otpCodeSchema` hanya memeriksa panjang 6 karakter, jadi `"abcdef"` lolos validasi. Tidak berbahaya karena kode tetap dicocokkan dengan hash | Belum diputuskan |
| Checkout memakai harga yang tersimpan di keranjang. Kalau admin mengubah harga setelah barang masuk keranjang, pembeli membayar harga lama | Belum diputuskan: disengaja atau perlu dihitung ulang |
| `getProductById`: komentar menyebut jawaban "tidak ada" tidak ikut tersimpan di cache, padahal `cached()` menyimpan `null` juga, jadi id yang tidak ada dijawab dari cache selama 5 menit. Dampaknya kecil karena setiap perubahan produk mengosongkan cache | Belum diputuskan: perbaiki kodenya atau komentarnya |
| Data nyata (Tahap 0): semua produk saat ini diskon 0, jadi persen diskon di test adalah contoh di atas harga nyata | Catatan saja |
| `formatRupiah` menampilkan harga berdesimal apa adanya, mis. `Rp18.667,6`. Baru terjadi kalau diskon menghasilkan pecahan rupiah; saat ini tidak ada karena semua diskon 0 | Catatan saja: perlu diputuskan kalau diskon mulai dipakai |
| `npx prettier --check` melaporkan 9 berkas backend lama. Penyebabnya hanya akhiran baris CRLF di working copy, bukan gaya kode | Catatan saja |

---

## Yang sengaja tidak dikerjakan dulu

Dicatat supaya tidak terlupa, bukan supaya dikerjakan sekarang:

- **Test yang menyentuh basis data sungguhan.** Butuh basis data PostgreSQL
  terpisah khusus test, diisi ulang sebelum setiap test. Berguna untuk menguji
  repository dan query Prisma, tapi pengaturannya cukup banyak.
- **Test endpoint lewat HTTP (`supertest`).** `app.js` sudah terpisah dari
  `server.js`, jadi aplikasi Express bisa dites tanpa membuka port. Paling
  berguna setelah ada basis data khusus test.
- **Test komponen Vue (`@vue/test-utils`).** Logika penting dipindah ke
  berkas `.js` biasa dan dites di sana. Test komponen baru perlu kalau ada
  perilaku tampilan yang sering rusak.
- **Test ujung ke ujung di peramban (Playwright).** Paling mendekati pemakaian
  sungguhan, tapi paling lambat dan paling sering gagal karena hal di luar
  kode.
- **Target persentase cakupan (coverage).** Angka cakupan tinggi tidak
  menjamin bagian yang penting sudah dites. Daftar di rencana ini lebih
  berguna daripada angka.

---

## Urutan pengerjaan yang disarankan

Backend dulu (Tahap 1 sampai 4), baru frontend (Tahap 5 sampai 6). Di dalam
backend, urutannya dari yang paling mudah: fungsi murni, lalu skema validasi,
lalu service dengan tiruan. Dua tahap pertama tidak butuh `vi.mock` sama
sekali, jadi cocok untuk membiasakan diri dengan Vitest.

Kalau waktu terbatas, bagian yang **paling wajib** selesai sebelum konversi
TypeScript:

1. `applyDiscount` dan `calculateDeliveryFee` (Tahap 2)
2. `product.validation.js` (Tahap 3)
3. Harga per tipe di `cart.service.js` (Tahap 4)
4. Rumus diskon dan kunci terjemahan di frontend (Tahap 6)

Keempatnya menjaga hal yang langsung dirasakan pembeli: harga yang dibayar
dan teks yang dibaca.
