// src/config/constants.js

/**
 * Nilai tetap yang dipakai di banyak tempat: identitas toko, tarif ongkir,
 * dan daftar rasa beserta penjelasannya.
 *
 * PENTING: sebagian isi berkas ini menyalin aturan yang sama dari backend
 * (ongkir & daftar rasa). Kalau salah satunya diubah, yang lain harus ikut,
 * kalau tidak angka yang dilihat pembeli berbeda dari yang dihitung server.
 */

/**
 * Identitas toko. Diambil dari environment variable supaya bisa diganti
 * tanpa menyunting kode.
 *
 * Yang kosong otomatis tidak ditampilkan — misalnya kalau `tiktok` belum
 * diisi, ikon TikTok tidak muncul di footer.
 */
export const STORE_INFO = {
  since: 2012,
  // Format internasional tanpa "+", mis. 6281234567890 (dituntut tautan wa.me)
  whatsappNumber: import.meta.env.VITE_OWNER_WHATSAPP_NUMBER || '',
  // Ketiganya nama pengguna tanpa "@"
  instagram: import.meta.env.VITE_OWNER_INSTAGRAM || '',
  threads: import.meta.env.VITE_OWNER_THREADS || '',
  tiktok: import.meta.env.VITE_OWNER_TIKTOK || '',
  address: import.meta.env.VITE_STORE_ADDRESS || '',
  // Nomor sertifikat halal BPJPH. Punya nilai bawaan karena jarang berubah,
  // tapi tetap bisa diganti lewat env.
  halalCertNumber: import.meta.env.VITE_HALAL_CERT_NUMBER || '3211000038200522',
}

/**
 * Tarif ongkir berjenjang menurut jarak dari toko, untuk ditampilkan di
 * halaman informasi.
 *
 * Ini hanya SALINAN untuk dibaca pembeli. Ongkir yang sebenarnya dihitung
 * server (backend order.helper.js), jadi kedua daftar ini harus selalu sama.
 */
export const MAX_DELIVERY_DISTANCE_KM = 25
export const DELIVERY_FEE_TIERS = [
  { label: 'Radius < 5 km', fee: 30000 },
  { label: 'Radius 5–10 km', fee: 45000 },
  { label: 'Radius 11–15 km', fee: 55000 },
  { label: 'Radius 16–20 km', fee: 65000 },
  { label: 'Radius 21–25 km', fee: 75000 },
]

// Baris DELIVERY_FEE_TIERS yang berlaku untuk suatu jarak, dipakai untuk
// menyorot tarif di checkout. -1 berarti jarak belum diketahui atau di luar
// jangkauan. Batasnya harus sama dengan calculateDeliveryFee di backend.
export const deliveryTierIndex = (distanceKm) => {
  const d = distanceKm
  if (d === null || d <= 0 || d > MAX_DELIVERY_DISTANCE_KM) return -1
  if (d < 5) return 0
  if (d <= 10) return 1
  if (d <= 15) return 2
  if (d <= 20) return 3
  return 4
}

// Rasa untuk petite cake custom decor (TYPE2).
// Salinan dari backend product.constant.js — ubah keduanya bersamaan.
export const TYPE2_FLAVORS = [
  'Double Choco',
  'Choco Blueberry',
  'Vanilla Cheese',
  'Vanilla Strawberry',
]

// Rasa untuk kue custom (TYPE4). Sama seperti di atas, salinan dari backend.
export const CUSTOM_FLAVORS = [
  'Blackforest',
  'Double Choco Cream',
  'Oreo Choco',
  'Snow White Double Cheese',
  'Vanilla Double Cheese',
  'Oreo Cheese',
]

/**
 * Penjelasan tiap rasa, muncul di panduan rasa pada halaman produk.
 *
 * Kuncinya HARUS sama persis dengan nama rasa di daftar-daftar di atas.
 * Rasa yang tidak punya penjelasan di sini tetap bisa dipilih pembeli —
 * ia hanya tidak ikut tampil di panduan.
 */
export const FLAVOR_DESCRIPTIONS = {
  'Double Choco': {
    id: 'Cake coklat lembut dengan lapisan Homemade Chocolate Ganache yang kaya rasa dan lumer di setiap gigitan.',
    en: 'Soft chocolate cake layered with Homemade Chocolate Ganache for a rich and indulgent chocolate flavor.',
  },
  'Choco Blueberry': {
    id: 'Cake coklat lembut dengan lapisan Selai Blueberry yang menghadirkan perpaduan rasa cokelat dan manis segar buah blueberry.',
    en: 'Soft chocolate cake layered with Blueberry Jam for a delightful balance of rich chocolate and fruity sweetness.',
  },
  'Vanilla Cheese': {
    id: 'Cake vanilla lembut dengan lapisan Cheddar Cheese Cream yang creamy dengan sentuhan gurih yang lembut.',
    en: 'Soft vanilla cake layered with Cheddar Cheese Cream for a smooth, creamy, and delicately cheesy flavor.',
  },
  'Vanilla Strawberry': {
    id: 'Cake vanilla lembut dengan lapisan Strawberry Jam yang memberikan rasa manis dan segar di setiap lapisan.',
    en: 'Soft vanilla cake layered with Strawberry Jam for a light, sweet, and fruity flavor.',
  },

  // Rasa cupcake. Namanya sengaja dibedakan dari rasa kue di atas walau
  // mirip, karena penjelasannya menyebut "cupcake" dan "isian",
  // bukan "cake" dan "lapisan".
  'Double Choco Cupcakes': {
    id: 'Cupcake coklat lembut dengan isian Homemade Chocolate Ganache yang kaya rasa dan lumer di setiap gigitan.',
    en: 'Soft chocolate cupcake filled with Homemade Chocolate Ganache for a rich and indulgent chocolate flavor.',
  },
  'Choco Blueberry Cupcakes': {
    id: 'Cupcake coklat lembut dengan isian Selai Blueberry yang menghadirkan perpaduan rasa cokelat dan manis segar buah blueberry.',
    en: 'Soft chocolate cupcake filled with Blueberry Jam for a delightful balance of rich chocolate and fruity sweetness.',
  },
  'Vanilla Cheese Cupcakes': {
    id: 'Cupcake vanilla lembut dengan isian Cheddar Cheese Cream yang creamy dengan sentuhan gurih yang lembut.',
    en: 'Soft vanilla cupcake filled with Cheddar Cheese Cream for a smooth, creamy, and delicately cheesy flavor.',
  },
  'Vanilla Strawberry Cupcakes': {
    id: 'Cupcake vanilla lembut dengan isian Strawberry Jam yang memberikan rasa manis dan segar di setiap gigitan.',
    en: 'Soft vanilla cupcake filled with Strawberry Jam for a light, sweet, and fruity flavor.',
  },

  Blackforest: {
    id: 'Cake coklat lembut dengan lapisan Blueberry Jam dan Blueberry Cream yang manis, segar, dan seimbang.',
    en: 'Soft chocolate cake layered with Blueberry Jam and Blueberry Cream for a perfectly balanced sweet and fruity flavor.',
  },
  'Double Choco Cream': {
    id: 'Cake coklat lembut dengan lapisan Homemade Chocolate Ganache dan Choco Cream yang kaya rasa dan creamy.',
    en: 'Soft chocolate cake layered with Homemade Chocolate Ganache and Choco Cream for a rich, creamy chocolate experience.',
  },
  'Oreo Choco': {
    id: 'Cake coklat lembut dengan lapisan Homemade Chocolate Ganache dan Oreo Crumble yang renyah di setiap gigitan.',
    en: 'Soft chocolate cake layered with Homemade Chocolate Ganache and crunchy Oreo Crumble for extra texture and flavor.',
  },
  'Snow White Double Cheese': {
    id: 'Cake vanilla lembut dengan lapisan Cheddar Cream Cheese dan Strawberry Jam yang memadukan rasa gurih dan segar.',
    en: 'Soft vanilla cake layered with Cheddar Cream Cheese and Strawberry Jam for a delightful sweet and savory combination.',
  },
  'Vanilla Double Cheese': {
    id: 'Cake vanilla lembut dengan lapisan Cheddar Cream Cheese di setiap layer, menghadirkan rasa creamy dan gurih yang lembut.',
    en: 'Soft vanilla cake layered with Cheddar Cream Cheese in every layer for a smooth, creamy, and cheesy flavor.',
  },
  'Oreo Cheese': {
    id: 'Cake vanilla lembut dengan lapisan Cheddar Cream Cheese dan Oreo Crumble yang creamy dengan sentuhan renyah.',
    en: 'Soft vanilla cake layered with Cheddar Cream Cheese and crunchy Oreo Crumble for a creamy flavor with a satisfying crunch.',
  },
}