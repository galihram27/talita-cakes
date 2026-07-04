// src/config/constants.js

// Info toko untuk halaman About Us dll.
// Isi yang tersedia saja — field kosong otomatis disembunyikan di halaman.
export const STORE_INFO = {
  since: 2012,
  whatsappNumber: '', // format internasional tanpa "+", contoh: 6281234567890
  instagram: '', // username tanpa "@", contoh: talitascake
  address: '', // alamat toko / area pengantaran
}

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