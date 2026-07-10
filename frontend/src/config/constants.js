// src/config/constants.js

// Info toko untuk halaman About Us dll.
// Isi yang tersedia saja — field kosong otomatis disembunyikan di halaman.
export const STORE_INFO = {
  since: 2012,
  whatsappNumber: import.meta.env.VITE_OWNER_WHATSAPP_NUMBER || '', // format internasional tanpa "+", contoh: 6281234567890
  instagram: import.meta.env.VITE_OWNER_INSTAGRAM || '', // username tanpa "@", contoh: talitascake
  threads: import.meta.env.VITE_OWNER_THREADS || '', // username tanpa "@", contoh: talitacakes
  tiktok: import.meta.env.VITE_OWNER_TIKTOK || '', // username tanpa "@", contoh: talitacakesdepok
  address: import.meta.env.VITE_STORE_ADDRESS || '', // alamat toko / area pengantaran
  // Sertifikat Halal BPJPH — bisa dioverride lewat env.
  halalCertNumber: import.meta.env.VITE_HALAL_CERT_NUMBER || '3211000038200522',
}

// Tarif ongkir berjenjang berdasarkan radius dari toko
// (mirror dari backend order.helper.js -> calculateDeliveryFee)
export const MAX_DELIVERY_DISTANCE_KM = 25
export const DELIVERY_FEE_TIERS = [
  { label: 'Radius < 5 km', fee: 30000 },
  { label: 'Radius 5–10 km', fee: 45000 },
  { label: 'Radius 11–15 km', fee: 55000 },
  { label: 'Radius 16–20 km', fee: 65000 },
  { label: 'Radius 21–25 km', fee: 75000 },
]

// daftar rasa yang bisa dipilih user untuk TYPE2 & TYPE4
// (mirror dari backend product.constant.js -> CUSTOM_FLAVORS)
export const CUSTOM_FLAVORS = [
  'Blackforest',
  'Double Choco Cream',
  'Oreo Choco',
  'Snow White Double Cheese',
  'Vanilla Double Cheese',
  'Oreo Cheese',
]